import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { leads } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { inngest } from "@/inngest/client";
import { logAudit } from "@/lib/audit";

export const leadsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(leads.tenantId, ctx.tenantId)];
      if (input.status) conditions.push(eq(leads.status, input.status));

      return ctx.db
        .select()
        .from(leads)
        .where(and(...conditions))
        .orderBy(desc(leads.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),

  create: protectedProcedure
    .input(
      z.object({
        email: z.string().email().optional(),
        phone: z.string().optional(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        company: z.string().optional(),
        source: z.string().default("manual"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [lead] = await ctx.db
        .insert(leads)
        .values({ tenantId: ctx.tenantId, ...input })
        .returning();

      // Trigger auto-qualification if commercial agent is active
      const { agents: agentsTable } = await import("@/db/schema");
      const [commercialAgent] = await ctx.db
        .select()
        .from(agentsTable)
        .where(
          and(
            eq(agentsTable.tenantId, ctx.tenantId),
            eq(agentsTable.type, "commercial"),
            eq(agentsTable.status, "active")
          )
        )
        .limit(1);

      if (commercialAgent) {
        await inngest.send({
          name: "agent/lead.new",
          data: {
            tenantId: ctx.tenantId,
            agentId: commercialAgent.id,
            leadId: lead.id,
            email: lead.email ?? "",
            company: lead.company ?? undefined,
            source: lead.source ?? "manual",
          },
        });
      }

      return lead;
    }),

  update: protectedProcedure
    .input(
      z.object({
        leadId: z.string().uuid(),
        status: z.enum(["new", "contacted", "qualified", "proposal", "won", "lost"]).optional(),
        score: z.number().min(0).max(100).optional(),
        notes: z.string().max(5000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { leadId, ...updates } = input;
      const [updated] = await ctx.db
        .update(leads)
        .set(updates)
        .where(and(eq(leads.id, leadId), eq(leads.tenantId, ctx.tenantId)))
        .returning();

      // Audit log on significant status changes
      if (input.status === "won" || input.status === "lost") {
        await logAudit({
          tenantId: ctx.tenantId,
          userId: ctx.dbUser.id,
          action: `lead.${input.status}`,
          resource: "lead",
          resourceId: leadId,
          detail: { status: input.status, score: updated?.score },
        });
      }

      return updated;
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const [stats] = await ctx.db
      .select({
        total: sql<number>`count(*)::int`,
        new: sql<number>`count(*) filter (where status = 'new')::int`,
        contacted: sql<number>`count(*) filter (where status = 'contacted')::int`,
        qualified: sql<number>`count(*) filter (where status = 'qualified')::int`,
        proposal: sql<number>`count(*) filter (where status = 'proposal')::int`,
        won: sql<number>`count(*) filter (where status = 'won')::int`,
        lost: sql<number>`count(*) filter (where status = 'lost')::int`,
        avgScore: sql<number>`coalesce(avg(score)::int, 0)`,
      })
      .from(leads)
      .where(eq(leads.tenantId, ctx.tenantId));

    return stats;
  }),
});
