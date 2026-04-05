import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../init";
import { agents, agentLogs, tasks, tenants } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { checkAgentCountAllowed, checkAgentTypeAllowed, PLAN_LIMITS } from "@/lib/usage-limits";
import { logAudit } from "@/lib/audit";
import { simulateAgent } from "@/agents/simulator";
import { executeAgent } from "@/agents/orchestrator";

export const agentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.db
      .select()
      .from(agents)
      .where(eq(agents.tenantId, ctx.tenantId))
      .orderBy(agents.createdAt);
  }),

  get: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [agent] = await ctx.db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.tenantId, ctx.tenantId)))
        .limit(1);

      if (!agent) return null;

      const logs = await ctx.db
        .select()
        .from(agentLogs)
        .where(eq(agentLogs.agentId, input.agentId))
        .orderBy(desc(agentLogs.createdAt))
        .limit(50);

      return { ...agent, logs };
    }),

  /** Plan info — allowed types + current count */
  planInfo: protectedProcedure.query(async ({ ctx }) => {
    const [tenant] = await ctx.db
      .select({ plan: tenants.plan })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    const plan = tenant?.plan ?? "trial";
    const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.trial;

    const [{ count }] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(agents)
      .where(eq(agents.tenantId, ctx.tenantId));

    return {
      plan,
      allowedTypes: limits.allowedAgentTypes,
      currentCount: count,
      maxCount: limits.maxAgents,
      features: limits.features,
    };
  }),

  create: adminProcedure
    .input(
      z.object({
        type: z.enum(["email", "commercial", "admin", "support", "direction"]),
        name: z.string().min(1).max(100),
        systemPrompt: z.string().max(10000).optional(),
        config: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const typeCheck = await checkAgentTypeAllowed(ctx.tenantId, input.type);
      if (!typeCheck.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: typeCheck.reason ?? "Type d'agent non autorise pour votre plan.",
        });
      }

      const countCheck = await checkAgentCountAllowed(ctx.tenantId);
      if (!countCheck.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: countCheck.reason ?? `Limite de ${countCheck.maxCount} agents atteinte.`,
        });
      }

      const [agent] = await ctx.db
        .insert(agents)
        .values({
          tenantId: ctx.tenantId,
          type: input.type,
          name: input.name,
          status: "setup",
          systemPrompt: input.systemPrompt,
          config: input.config ?? {},
        })
        .returning();

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.dbUser.id,
        action: "agent.created",
        resource: "agent",
        resourceId: agent.id,
        detail: { type: input.type, name: input.name },
      });

      return agent;
    }),

  rename: adminProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      name: z.string().min(1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(agents)
        .set({ name: input.name })
        .where(and(eq(agents.id, input.agentId), eq(agents.tenantId, ctx.tenantId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });
      return updated;
    }),

  updateStatus: adminProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        status: z.enum(["active", "paused", "setup"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(agents)
        .set({ status: input.status })
        .where(and(eq(agents.id, input.agentId), eq(agents.tenantId, ctx.tenantId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "Agent non trouve." });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.dbUser.id,
        action: "agent.status_changed",
        resource: "agent",
        resourceId: input.agentId,
        detail: { newStatus: input.status },
      });

      return updated;
    }),

  updateConfig: adminProcedure
    .input(
      z.object({
        agentId: z.string().uuid(),
        config: z.record(z.unknown()).optional(),
        systemPrompt: z.string().max(10000).optional().nullable(),
        name: z.string().min(1).max(100).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};
      if (input.config !== undefined) updateData.config = input.config;
      if (input.systemPrompt !== undefined) updateData.systemPrompt = input.systemPrompt;
      if (input.name !== undefined) updateData.name = input.name;

      const [updated] = await ctx.db
        .update(agents)
        .set(updateData)
        .where(and(eq(agents.id, input.agentId), eq(agents.tenantId, ctx.tenantId)))
        .returning();

      if (!updated) throw new TRPCError({ code: "NOT_FOUND" });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.dbUser.id,
        action: "agent.config_updated",
        resource: "agent",
        resourceId: input.agentId,
        detail: { updatedFields: Object.keys(updateData) },
      });

      return updated;
    }),

  /** Test run — always uses simulation mode (0 cost) */
  testRun: protectedProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      taskType: z.string().min(1),
      testInput: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const [agent] = await ctx.db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.tenantId, ctx.tenantId)))
        .limit(1);

      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });

      // Always simulate (0 cost test)
      const result = simulateAgent(agent.type, input.taskType, input.testInput);

      return {
        text: result.text,
        toolResults: result.toolResults,
        isSimulated: true,
        agentType: agent.type,
        taskType: input.taskType,
      };
    }),

  /** Trigger a real task execution */
  trigger: adminProcedure
    .input(z.object({
      agentId: z.string().uuid(),
      taskType: z.string().min(1),
      taskInput: z.record(z.unknown()),
    }))
    .mutation(async ({ ctx, input }) => {
      const [agent] = await ctx.db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.tenantId, ctx.tenantId)))
        .limit(1);

      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });

      if (agent.status !== "active") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "L'agent doit etre actif pour executer des taches.",
        });
      }

      const result = await executeAgent({
        tenantId: ctx.tenantId,
        agentId: input.agentId,
        type: input.taskType,
        input: input.taskInput,
      });

      return result;
    }),

  /** Daily task stats for chart (last 14 days) */
  dailyStats: protectedProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.execute(sql`
        SELECT
          date_trunc('day', created_at)::date as date,
          count(*) filter (where status = 'completed')::int as completed,
          count(*) filter (where status = 'failed')::int as failed
        FROM tasks
        WHERE tenant_id = ${ctx.tenantId}
          AND agent_id = ${input.agentId}
          AND created_at >= now() - interval '14 days'
        GROUP BY 1
        ORDER BY 1
      `);
      return rows as unknown as Array<{ date: string; completed: number; failed: number }>;
    }),

  /** Clone an agent */
  clone: adminProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [original] = await ctx.db
        .select()
        .from(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.tenantId, ctx.tenantId)))
        .limit(1);

      if (!original) throw new TRPCError({ code: "NOT_FOUND" });

      const countCheck = await checkAgentCountAllowed(ctx.tenantId);
      if (!countCheck.allowed) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: countCheck.reason ?? "Limite d'agents atteinte.",
        });
      }

      const [clone] = await ctx.db
        .insert(agents)
        .values({
          tenantId: ctx.tenantId,
          type: original.type,
          name: `${original.name} (copie)`,
          status: "setup",
          systemPrompt: original.systemPrompt,
          config: original.config,
        })
        .returning();

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.dbUser.id,
        action: "agent.cloned",
        resource: "agent",
        resourceId: clone.id,
        detail: { originalId: input.agentId },
      });

      return clone;
    }),

  delete: adminProcedure
    .input(z.object({ agentId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const [processing] = await ctx.db
        .select({ count: sql<number>`count(*)::int` })
        .from(tasks)
        .where(
          and(
            eq(tasks.agentId, input.agentId),
            eq(tasks.tenantId, ctx.tenantId),
            eq(tasks.status, "processing")
          )
        );

      if (processing.count > 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Impossible de supprimer: ${processing.count} tache(s) en cours.`,
        });
      }

      await ctx.db
        .delete(agents)
        .where(and(eq(agents.id, input.agentId), eq(agents.tenantId, ctx.tenantId)));

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.dbUser.id,
        action: "agent.deleted",
        resource: "agent",
        resourceId: input.agentId,
      });

      return { success: true };
    }),
});
