import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { tasks } from "@/db/schema";
import { eq, and, desc, sql, gte } from "drizzle-orm";

export const tasksRouter = router({
  /** List tasks with filters */
  list: protectedProcedure
    .input(
      z.object({
        agentId: z.string().uuid().optional(),
        status: z.enum(["pending", "processing", "completed", "failed", "escalated"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tasks.tenantId, ctx.tenantId)];
      if (input.agentId) conditions.push(eq(tasks.agentId, input.agentId));
      if (input.status) conditions.push(eq(tasks.status, input.status));

      return ctx.db
        .select()
        .from(tasks)
        .where(and(...conditions))
        .orderBy(desc(tasks.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  /** Get task detail */
  get: protectedProcedure
    .input(z.object({ taskId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [task] = await ctx.db
        .select()
        .from(tasks)
        .where(and(eq(tasks.id, input.taskId), eq(tasks.tenantId, ctx.tenantId)))
        .limit(1);

      return task ?? null;
    }),

  /** Dashboard stats */
  stats: protectedProcedure
    .input(
      z.object({
        period: z.enum(["today", "week", "month"]).default("today"),
      })
    )
    .query(async ({ ctx, input }) => {
      const periodMap = {
        today: sql`now() - interval '24 hours'`,
        week: sql`now() - interval '7 days'`,
        month: sql`now() - interval '30 days'`,
      };

      const [stats] = await ctx.db
        .select({
          total: sql<number>`count(*)::int`,
          completed: sql<number>`count(*) filter (where status = 'completed')::int`,
          failed: sql<number>`count(*) filter (where status = 'failed')::int`,
          escalated: sql<number>`count(*) filter (where status = 'escalated')::int`,
          avgDurationMs: sql<number>`coalesce(avg(duration_ms)::int, 0)`,
          totalTokens: sql<number>`coalesce(sum(tokens_used)::int, 0)`,
          totalCostCents: sql<number>`coalesce(sum(cost_cents)::int, 0)`,
          successRate: sql<number>`
            case when count(*) > 0
            then (count(*) filter (where status = 'completed') * 100 / count(*))::int
            else 100 end`,
        })
        .from(tasks)
        .where(
          and(
            eq(tasks.tenantId, ctx.tenantId),
            gte(tasks.createdAt, periodMap[input.period])
          )
        );

      return stats;
    }),

  /** Tasks per hour (for charts) */
  timeline: protectedProcedure
    .input(
      z.object({
        hours: z.number().int().min(1).max(168).default(24),
      })
    )
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute(sql`
        SELECT
          date_trunc('hour', created_at) as hour,
          count(*)::int as total,
          count(*) filter (where status = 'completed')::int as completed,
          count(*) filter (where status = 'failed')::int as failed
        FROM tasks
        WHERE tenant_id = ${ctx.tenantId}
          AND created_at >= now() - make_interval(hours => ${input.hours})
        GROUP BY 1
        ORDER BY 1
      `);

      return rows;
    }),
});
