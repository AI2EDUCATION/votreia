import { db } from "@/db";
import { tenants, tasks, agents, subscriptions } from "@/db/schema";
import { usageRecords } from "@/db/schema/usage";
import { eq, and, sql, gte } from "drizzle-orm";

// ============================================
// PLAN LIMITS — Configuration stricte
// Chaque plan a des limites hard-codées.
// Aucune tâche ne s'exécute si les limites sont dépassées.
// ============================================

export interface PlanLimits {
  /** Nombre max d'agents simultanés */
  maxAgents: number;
  /** Tâches max par jour (rolling 24h) */
  maxTasksPerDay: number;
  /** Tâches max par mois (rolling 30j) */
  maxTasksPerMonth: number;
  /** Budget tokens max par mois (input + output combinés) */
  maxTokensPerMonth: number;
  /** Budget API max en centimes par mois */
  maxCostCentsPerMonth: number;
  /** Types d'agents autorisés */
  allowedAgentTypes: string[];
  /** Accès aux features premium */
  features: {
    apiAccess: boolean;
    customPrompts: boolean;
    priorityProcessing: boolean;
    advancedAnalytics: boolean;
    smsNotifications: boolean;
    dailyBrief: boolean;
    documentOcr: boolean;
    crmIntegration: boolean;
  };
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  trial: {
    maxAgents: 1,
    maxTasksPerDay: 10,
    maxTasksPerMonth: 100,
    maxTokensPerMonth: 0,              // Simulation mode — 0 tokens consumed
    maxCostCentsPerMonth: 0,           // 0€ — aucun appel API Claude
    allowedAgentTypes: ["email"],
    features: {
      apiAccess: false,
      customPrompts: false,
      priorityProcessing: false,
      advancedAnalytics: false,
      smsNotifications: false,
      dailyBrief: false,
      documentOcr: false,
      crmIntegration: false,
    },
  },

  essentiel: {
    maxAgents: 1,
    maxTasksPerDay: 50,
    maxTasksPerMonth: 1_500,
    maxTokensPerMonth: 3_000_000,      // ~12€ API cost
    maxCostCentsPerMonth: 2_000,       // 20€ hard cap → marge 98%
    allowedAgentTypes: ["email", "commercial", "admin"],
    features: {
      apiAccess: false,
      customPrompts: false,
      priorityProcessing: false,
      advancedAnalytics: false,
      smsNotifications: false,
      dailyBrief: false,
      documentOcr: true,
      crmIntegration: false,
    },
  },

  professionnel: {
    maxAgents: 3,
    maxTasksPerDay: 150,
    maxTasksPerMonth: 4_500,
    maxTokensPerMonth: 10_000_000,     // ~35€ API cost
    maxCostCentsPerMonth: 6_000,       // 60€ hard cap → marge 96.8%
    allowedAgentTypes: ["email", "commercial", "admin", "support", "direction"],
    features: {
      apiAccess: false,
      customPrompts: true,
      priorityProcessing: true,
      advancedAnalytics: true,
      smsNotifications: true,
      dailyBrief: true,
      documentOcr: true,
      crmIntegration: true,
    },
  },

  commande_totale: {
    maxAgents: 10,
    maxTasksPerDay: 500,
    maxTasksPerMonth: 15_000,
    maxTokensPerMonth: 50_000_000,     // ~150€ API cost
    maxCostCentsPerMonth: 25_000,      // 250€ hard cap
    allowedAgentTypes: ["email", "commercial", "admin", "support", "direction"],
    features: {
      apiAccess: true,
      customPrompts: true,
      priorityProcessing: true,
      advancedAnalytics: true,
      smsNotifications: true,
      dailyBrief: true,
      documentOcr: true,
      crmIntegration: true,
    },
  },
};

// ============================================
// USAGE CHECK — Appelé AVANT chaque exécution d'agent
// ============================================

export interface UsageCheckResult {
  allowed: boolean;
  reason?: string;
  usage: {
    tasksToday: number;
    tasksMonth: number;
    tokensMonth: number;
    costCentsMonth: number;
    activeAgents: number;
  };
  limits: PlanLimits;
  /** Pourcentage d'utilisation (0-100) sur la métrique la plus haute */
  utilizationPercent: number;
}

export async function checkUsageLimits(tenantId: string): Promise<UsageCheckResult> {
  // 1. Get tenant plan
  const [tenant] = await db
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  if (!tenant) {
    return {
      allowed: false,
      reason: "TENANT_NOT_FOUND",
      usage: { tasksToday: 0, tasksMonth: 0, tokensMonth: 0, costCentsMonth: 0, activeAgents: 0 },
      limits: PLAN_LIMITS.trial,
      utilizationPercent: 0,
    };
  }

  const limits = PLAN_LIMITS[tenant.plan] ?? PLAN_LIMITS.trial;

  // 2. Fetch current usage (parallel)
  const [dailyStats, monthlyStats, agentCount] = await Promise.all([
    // Tasks last 24h
    db
      .select({
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.tenantId, tenantId),
          gte(tasks.createdAt, sql`now() - interval '24 hours'`)
        )
      ),

    // Tasks + tokens + cost last 30 days
    db
      .select({
        count: sql<number>`count(*)::int`,
        tokens: sql<number>`coalesce(sum(tokens_used)::int, 0)`,
        cost: sql<number>`coalesce(sum(cost_cents)::int, 0)`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.tenantId, tenantId),
          gte(tasks.createdAt, sql`now() - interval '30 days'`)
        )
      ),

    // Active agents count
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(
        and(
          eq(agents.tenantId, tenantId),
          eq(agents.status, "active")
        )
      ),
  ]);

  const usage = {
    tasksToday: dailyStats[0]?.count ?? 0,
    tasksMonth: monthlyStats[0]?.count ?? 0,
    tokensMonth: monthlyStats[0]?.tokens ?? 0,
    costCentsMonth: monthlyStats[0]?.cost ?? 0,
    activeAgents: agentCount[0]?.count ?? 0,
  };

  // 3. Check each limit
  const checks = [
    {
      current: usage.tasksToday,
      max: limits.maxTasksPerDay,
      reason: "DAILY_TASK_LIMIT",
      label: "tâches/jour",
    },
    {
      current: usage.tasksMonth,
      max: limits.maxTasksPerMonth,
      reason: "MONTHLY_TASK_LIMIT",
      label: "tâches/mois",
    },
    {
      current: usage.tokensMonth,
      max: limits.maxTokensPerMonth,
      reason: "MONTHLY_TOKEN_LIMIT",
      label: "tokens/mois",
    },
    {
      current: usage.costCentsMonth,
      max: limits.maxCostCentsPerMonth,
      reason: "MONTHLY_COST_LIMIT",
      label: "budget API/mois",
    },
  ];

  // Find the first violated limit
  // Skip checks where max = 0 (means "not applicable" e.g. trial simulation mode)
  for (const check of checks) {
    if (check.max > 0 && check.current >= check.max) {
      return {
        allowed: false,
        reason: check.reason,
        usage,
        limits,
        utilizationPercent: 100,
      };
    }
  }

  // Calculate max utilization across all metrics
  const utilizations = checks.map((c) =>
    c.max > 0 ? Math.round((c.current / c.max) * 100) : 0
  );
  const utilizationPercent = Math.max(...utilizations);

  return {
    allowed: true,
    usage,
    limits,
    utilizationPercent,
  };
}

// ============================================
// AGENT TYPE CHECK — Vérifie si le type d'agent est autorisé
// ============================================

export async function checkAgentTypeAllowed(
  tenantId: string,
  agentType: string
): Promise<{ allowed: boolean; reason?: string }> {
  const [tenant] = await db
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const limits = PLAN_LIMITS[tenant?.plan ?? "trial"] ?? PLAN_LIMITS.trial;

  if (!limits.allowedAgentTypes.includes(agentType)) {
    return {
      allowed: false,
      reason: `L'agent "${agentType}" n'est pas disponible dans votre plan ${tenant?.plan ?? "trial"}. Passez au plan supérieur.`,
    };
  }

  return { allowed: true };
}

// ============================================
// AGENT COUNT CHECK — Vérifie si on peut ajouter un agent
// ============================================

export async function checkAgentCountAllowed(
  tenantId: string
): Promise<{ allowed: boolean; currentCount: number; maxCount: number; reason?: string }> {
  const [tenant] = await db
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const limits = PLAN_LIMITS[tenant?.plan ?? "trial"] ?? PLAN_LIMITS.trial;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agents)
    .where(
      and(
        eq(agents.tenantId, tenantId),
        sql`status != 'paused'` // paused agents don't count
      )
    );

  if (count >= limits.maxAgents) {
    return {
      allowed: false,
      currentCount: count,
      maxCount: limits.maxAgents,
      reason: `Limite de ${limits.maxAgents} agent(s) atteinte pour votre plan ${tenant?.plan ?? "trial"}.`,
    };
  }

  return { allowed: true, currentCount: count, maxCount: limits.maxAgents };
}

// ============================================
// FEATURE CHECK — Vérifie l'accès à une feature premium
// ============================================

export async function checkFeatureAccess(
  tenantId: string,
  feature: keyof PlanLimits["features"]
): Promise<boolean> {
  const [tenant] = await db
    .select({ plan: tenants.plan })
    .from(tenants)
    .where(eq(tenants.id, tenantId))
    .limit(1);

  const limits = PLAN_LIMITS[tenant?.plan ?? "trial"] ?? PLAN_LIMITS.trial;
  return limits.features[feature] ?? false;
}

// ============================================
// USAGE WARNING THRESHOLDS
// ============================================

export function getWarningLevel(utilizationPercent: number): "ok" | "warning" | "critical" | "exceeded" {
  if (utilizationPercent >= 100) return "exceeded";
  if (utilizationPercent >= 90) return "critical";
  if (utilizationPercent >= 75) return "warning";
  return "ok";
}

// ============================================
// RECORD USAGE — Log usage after task completion
// ============================================

export async function recordUsage(params: {
  tenantId: string;
  agentId: string;
  tokensUsed: number;
  costCents: number;
  taskType: string;
}) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  try {
    // Upsert daily usage record
    await db.execute(sql`
      INSERT INTO usage_records (tenant_id, date, tasks_count, tokens_used, cost_cents)
      VALUES (${params.tenantId}, ${today}::date, 1, ${params.tokensUsed}, ${params.costCents})
      ON CONFLICT (tenant_id, date)
      DO UPDATE SET
        tasks_count = usage_records.tasks_count + 1,
        tokens_used = usage_records.tokens_used + ${params.tokensUsed},
        cost_cents = usage_records.cost_cents + ${params.costCents},
        updated_at = now()
    `);
  } catch (error) {
    // Don't fail the task if usage recording fails
    console.error("Failed to record usage:", error);
  }
}
