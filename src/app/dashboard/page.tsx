import { db } from "@/db";
import { agents, tasks, leads, documents, emailAccounts } from "@/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { users, tenants } from "@/db/schema";
import { checkUsageLimits, getWarningLevel } from "@/lib/usage-limits";
import { UsageMeter } from "@/components/dashboard/usage-meter";
import {
  Activity,
  CheckCircle2,
  Zap,
  TrendingUp,
  Bot,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { AutoRefresh } from "@/components/dashboard/auto-refresh";
import { OnboardingChecklist } from "@/components/dashboard/onboarding-checklist";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

export default async function DashboardPage() {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const now24h = sql`now() - interval '24 hours'`;

  const [taskStats, agentList, recentTasks, leadStats, usageCheck, tenantData, docCount, emailAccountCount] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where status = 'completed')::int`,
        failed: sql<number>`count(*) filter (where status = 'failed')::int`,
        escalated: sql<number>`count(*) filter (where status = 'escalated')::int`,
        avgMs: sql<number>`coalesce(avg(duration_ms)::int, 0)`,
        costCents: sql<number>`coalesce(sum(cost_cents)::int, 0)`,
      })
      .from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), gte(tasks.createdAt, now24h))),
    db.select().from(agents).where(eq(agents.tenantId, tenantId)),
    db
      .select()
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId))
      .orderBy(desc(tasks.createdAt))
      .limit(10),
    db
      .select({
        total: sql<number>`count(*)::int`,
        qualified: sql<number>`count(*) filter (where status = 'qualified')::int`,
        won: sql<number>`count(*) filter (where status = 'won')::int`,
      })
      .from(leads)
      .where(eq(leads.tenantId, tenantId)),
    checkUsageLimits(tenantId),
    db.select({ plan: tenants.plan, name: tenants.name }).from(tenants).where(eq(tenants.id, tenantId)).limit(1),
    // Onboarding checks
    db.select({ count: sql<number>`count(*)::int` }).from(documents).where(eq(documents.tenantId, tenantId)),
    db.select({ count: sql<number>`count(*)::int` }).from(emailAccounts).where(eq(emailAccounts.tenantId, tenantId)),
  ]);

  const stats = taskStats[0];
  const lStats = leadStats[0];
  const activeAgents = agentList.filter((a) => a.status === "active").length;
  const successRate = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 100;

  const isTrial = (tenantData[0]?.plan ?? "trial") === "trial";

  return (
    <div className="space-y-6">
      {/* Auto-refresh dashboard every 60s */}
      <AutoRefresh intervalMs={60000} />

      {/* Welcome banner */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 dark:from-brand-900 dark:to-brand-800 p-6 sm:p-8 text-white">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-brand-200" />
            <span className="text-sm font-medium text-brand-200">Tableau de bord</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            Bonjour{tenantData[0]?.name ? `, ${tenantData[0].name}` : ""} 👋
          </h1>
          <p className="text-brand-100/70 text-sm sm:text-base max-w-lg">
            {isTrial
              ? "Vous etes en mode essai. Vos agents fonctionnent avec des reponses demo."
              : `${activeAgents} agent${activeAgents > 1 ? "s" : ""} actif${activeAgents > 1 ? "s" : ""} traitent vos taches en ce moment.`
            }
          </p>
          {isTrial && (
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors"
            >
              Activer l'IA reelle
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>

      {/* Onboarding checklist */}
      <OnboardingChecklist
        hasAgents={agentList.length > 0}
        hasActiveAgent={activeAgents > 0}
        hasLeads={lStats.total > 0}
        hasDocuments={(docCount[0]?.count ?? 0) > 0}
        hasIntegration={(emailAccountCount[0]?.count ?? 0) > 0}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <KPICard
          icon={<Zap className="w-5 h-5" />}
          label="Taches traitees"
          value={stats.total}
          accent="brand"
          trend={stats.total > 0 ? "+12%" : undefined}
          trendUp={true}
        />
        <KPICard
          icon={<CheckCircle2 className="w-5 h-5" />}
          label="Taux de reussite"
          value={`${successRate}%`}
          accent="emerald"
          trend={successRate >= 90 ? "Excellent" : undefined}
          trendUp={successRate >= 90}
        />
        <KPICard
          icon={<Bot className="w-5 h-5" />}
          label="Agents actifs"
          value={`${activeAgents}/${agentList.length}`}
          accent="violet"
        />
        <KPICard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Cout API (24h)"
          value={`${(stats.costCents / 100).toFixed(2)}€`}
          accent="amber"
        />
      </div>

      {/* Usage meter */}
      <UsageMeter
        data={{
          plan: tenantData[0]?.plan ?? "trial",
          usage: usageCheck.usage,
          limits: {
            maxAgents: usageCheck.limits.maxAgents,
            maxTasksPerDay: usageCheck.limits.maxTasksPerDay,
            maxTasksPerMonth: usageCheck.limits.maxTasksPerMonth,
            maxTokensPerMonth: usageCheck.limits.maxTokensPerMonth,
            maxCostCentsPerMonth: usageCheck.limits.maxCostCentsPerMonth,
          },
          utilization: {
            percent: usageCheck.utilizationPercent,
            level: getWarningLevel(usageCheck.utilizationPercent),
            tasksDay: usageCheck.limits.maxTasksPerDay > 0
              ? Math.round((usageCheck.usage.tasksToday / usageCheck.limits.maxTasksPerDay) * 100)
              : 0,
            tasksMonth: usageCheck.limits.maxTasksPerMonth > 0
              ? Math.round((usageCheck.usage.tasksMonth / usageCheck.limits.maxTasksPerMonth) * 100)
              : 0,
            tokensMonth: usageCheck.limits.maxTokensPerMonth > 0
              ? Math.round((usageCheck.usage.tokensMonth / usageCheck.limits.maxTokensPerMonth) * 100)
              : 0,
            costMonth: usageCheck.limits.maxCostCentsPerMonth > 0
              ? Math.round((usageCheck.usage.costCentsMonth / usageCheck.limits.maxCostCentsPerMonth) * 100)
              : 0,
          },
          allowed: usageCheck.allowed,
        }}
      />

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity feed */}
        <div className="lg:col-span-2 card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-surface-400" />
              <h3 className="font-semibold text-surface-900 dark:text-surface-50">Activite recente</h3>
            </div>
            <Link href="/dashboard/tasks" className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-white/[0.04]">
            {recentTasks.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="w-12 h-12 bg-surface-100 dark:bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6 text-surface-300 dark:text-surface-600" />
                </div>
                <p className="text-sm text-surface-500 mb-1">Aucune tache recente</p>
                <p className="text-xs text-surface-400">Activez un agent pour commencer.</p>
              </div>
            ) : (
              recentTasks.map((task) => (
                <div
                  key={task.id}
                  className="px-5 py-3 flex items-center justify-between table-row"
                >
                  <div className="flex items-center gap-3">
                    <StatusDot status={task.status} />
                    <div>
                      <div className="text-sm font-medium text-surface-800 dark:text-surface-200">
                        {task.type}
                      </div>
                      <div className="text-xs text-surface-400">
                        {task.durationMs ? `${(task.durationMs / 1000).toFixed(1)}s` : "—"}
                        {task.modelUsed && ` · ${task.modelUsed.split("-").slice(0, 2).join(" ")}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <TaskStatusBadge status={task.status} />
                    <div className="text-xs text-surface-400 tabular-nums">
                      {new Date(task.createdAt).toLocaleTimeString("fr-FR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Agents sidebar */}
        <div className="space-y-4">
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-surface-400" />
                <h3 className="font-semibold text-surface-900 dark:text-surface-50">Agents</h3>
              </div>
              <Link href="/dashboard/agents" className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline">
                Gerer
              </Link>
            </div>
            <div className="divide-y divide-surface-100 dark:divide-white/[0.04]">
              {agentList.length === 0 ? (
                <div className="px-5 py-8 text-center">
                  <p className="text-sm text-surface-400 mb-2">Aucun agent configure.</p>
                  <Link href="/dashboard/agents" className="text-xs text-brand-600 dark:text-brand-400 font-medium hover:underline">
                    Creer un agent →
                  </Link>
                </div>
              ) : (
                agentList.map((agent) => (
                  <div key={agent.id} className="px-5 py-3 flex items-center justify-between table-row">
                    <div className="flex items-center gap-3">
                      <AgentIcon type={agent.type} />
                      <div>
                        <div className="text-sm font-medium text-surface-800 dark:text-surface-200">
                          {agent.name}
                        </div>
                        <div className="text-xs text-surface-400 capitalize">
                          {agent.type}
                        </div>
                      </div>
                    </div>
                    <AgentStatusBadge status={agent.status} />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Pipeline quick stats */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-surface-400" />
              <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">Pipeline</span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-lg bg-surface-50 dark:bg-white/[0.03]">
                <div className="text-xl font-bold text-surface-900 dark:text-surface-50">{lStats.total}</div>
                <div className="text-xs text-surface-400 mt-0.5">Total</div>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5">
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{lStats.qualified}</div>
                <div className="text-xs text-surface-400 mt-0.5">Qualifies</div>
              </div>
              <div className="p-3 rounded-lg bg-brand-50/50 dark:bg-brand-500/5">
                <div className="text-xl font-bold text-brand-600 dark:text-brand-400">{lStats.won}</div>
                <div className="text-xs text-surface-400 mt-0.5">Gagnes</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Sub-components
// ============================================

function KPICard({
  icon,
  label,
  value,
  accent,
  trend,
  trendUp,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: "brand" | "emerald" | "violet" | "amber";
  trend?: string;
  trendUp?: boolean;
}) {
  const colors = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };

  return (
    <div className="stat-card group hover:shadow-elevation-2 transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[accent]} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
        {trend && (
          <div className={`flex items-center gap-0.5 text-xs font-medium ${trendUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}`}>
            {trendUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <div className="stat-value mt-3">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500",
    failed: "bg-red-500",
    escalated: "bg-amber-500",
    processing: "bg-blue-500 animate-pulse",
    pending: "bg-surface-300 dark:bg-surface-600",
  };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status] ?? colors.pending}`} />;
}

function TaskStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "badge-success",
    failed: "badge-danger",
    escalated: "badge-warning",
    processing: "badge-info",
    pending: "bg-surface-100 text-surface-500 badge dark:bg-white/5 dark:text-surface-400",
  };
  const labels: Record<string, string> = {
    completed: "OK",
    failed: "Erreur",
    escalated: "Escalade",
    processing: "En cours",
    pending: "Attente",
  };
  return <span className={`${styles[status] ?? styles.pending} text-[10px]`}>{labels[status] ?? status}</span>;
}

function AgentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "badge-success",
    paused: "badge-warning",
    error: "badge-danger",
    setup: "badge-info",
  };
  const labels: Record<string, string> = {
    active: "Actif",
    paused: "Pause",
    error: "Erreur",
    setup: "Config",
  };
  return <span className={styles[status] ?? "badge-info"}>{labels[status] ?? status}</span>;
}

function AgentIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    email: "✉️",
    commercial: "💼",
    admin: "📄",
    support: "🎧",
    direction: "📊",
  };
  return (
    <span className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-white/[0.06] flex items-center justify-center text-base">
      {icons[type] ?? "🤖"}
    </span>
  );
}
