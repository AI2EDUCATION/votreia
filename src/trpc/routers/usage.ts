import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { tasks } from "@/db/schema";
import { usageRecords } from "@/db/schema/usage";
import { tenants } from "@/db/schema";
import { eq, and, sql, gte, desc } from "drizzle-orm";
import { PLAN_LIMITS, checkUsageLimits, getWarningLevel } from "@/lib/usage-limits";

export const usageRouter = router({
  /** Get current usage vs plan limits */
  current: protectedProcedure.query(async ({ ctx }) => {
    const check = await checkUsageLimits(ctx.tenantId);

    // Get tenant plan name
    const [tenant] = await ctx.db
      .select({ plan: tenants.plan })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    const plan = tenant?.plan ?? "trial";
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.trial;

    return {
      plan,
      usage: check.usage,
      limits: {
        maxAgents: limits.maxAgents,
        maxTasksPerDay: limits.maxTasksPerDay,
        maxTasksPerMonth: limits.maxTasksPerMonth,
        maxTokensPerMonth: limits.maxTokensPerMonth,
        maxCostCentsPerMonth: limits.maxCostCentsPerMonth,
      },
      utilization: {
        percent: check.utilizationPercent,
        level: getWarningLevel(check.utilizationPercent),
        tasksDay: limits.maxTasksPerDay > 0
          ? Math.round((check.usage.tasksToday / limits.maxTasksPerDay) * 100)
          : 0,
        tasksMonth: limits.maxTasksPerMonth > 0
          ? Math.round((check.usage.tasksMonth / limits.maxTasksPerMonth) * 100)
          : 0,
        tokensMonth: limits.maxTokensPerMonth > 0
          ? Math.round((check.usage.tokensMonth / limits.maxTokensPerMonth) * 100)
          : 0,
        costMonth: limits.maxCostCentsPerMonth > 0
          ? Math.round((check.usage.costCentsMonth / limits.maxCostCentsPerMonth) * 100)
          : 0,
      },
      allowed: check.allowed,
      features: limits.features,
    };
  }),

  /** Usage history (daily records for charts) */
  history: protectedProcedure
    .input(
      z.object({
        days: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const records = await ctx.db
        .select()
        .from(usageRecords)
        .where(
          and(
            eq(usageRecords.tenantId, ctx.tenantId),
            gte(usageRecords.date, sql`CURRENT_DATE - ${input.days}::int`)
          )
        )
        .orderBy(desc(usageRecords.date))
        .limit(input.days);

      return records;
    }),

  /** Cost breakdown by agent type (current month) */
  costBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const breakdown = await ctx.db
      .select({
        agentType: sql<string>`a.type`,
        taskCount: sql<number>`count(*)::int`,
        tokensUsed: sql<number>`coalesce(sum(t.tokens_used)::int, 0)`,
        costCents: sql<number>`coalesce(sum(t.cost_cents)::int, 0)`,
        avgDurationMs: sql<number>`coalesce(avg(t.duration_ms)::int, 0)`,
      })
      .from(tasks)
      .innerJoin(sql`agents a`, sql`a.id = ${tasks.agentId}`)
      .where(
        and(
          eq(tasks.tenantId, ctx.tenantId),
          gte(tasks.createdAt, sql`date_trunc('month', CURRENT_DATE)`)
        )
      )
      .groupBy(sql`a.type`);

    return breakdown;
  }),

  /** Plan comparison for upgrade prompts */
  planComparison: protectedProcedure.query(async ({ ctx }) => {
    const [tenant] = await ctx.db
      .select({ plan: tenants.plan })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    const currentPlan = tenant?.plan ?? "trial";

    return Object.entries(PLAN_LIMITS).map(([key, limits]) => ({
      key,
      isCurrent: key === currentPlan,
      maxAgents: limits.maxAgents,
      maxTasksPerDay: limits.maxTasksPerDay,
      maxTasksPerMonth: limits.maxTasksPerMonth,
      maxTokensPerMonth: limits.maxTokensPerMonth,
      features: limits.features,
    }));
  }),
});
