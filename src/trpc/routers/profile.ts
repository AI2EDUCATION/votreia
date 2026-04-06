import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../init";
import { users, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export const profileRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.dbUser.id,
      email: ctx.dbUser.email,
      fullName: ctx.dbUser.fullName,
      role: ctx.dbUser.role,
      avatarUrl: ctx.dbUser.avatarUrl,
      lastLogin: ctx.dbUser.lastLogin,
      createdAt: ctx.dbUser.createdAt,
    };
  }),

  update: protectedProcedure
    .input(z.object({
      fullName: z.string().min(1).max(200).optional(),
      avatarUrl: z.string().url().max(500).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, unknown> = {};
      if (input.fullName !== undefined) updateData.fullName = input.fullName;
      if (input.avatarUrl !== undefined) updateData.avatarUrl = input.avatarUrl;

      const [updated] = await ctx.db
        .update(users)
        .set(updateData)
        .where(eq(users.id, ctx.dbUser.id))
        .returning();

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.dbUser.id,
        action: "profile.updated",
        resource: "user",
        resourceId: ctx.dbUser.id,
      });

      return updated;
    }),

  /** Export user data for RGPD compliance */
  exportData: protectedProcedure.query(async ({ ctx }) => {
    const { tasks, leads, agents, agentLogs, documents, notifications } = await import("@/db/schema");
    const { eq: eqOp, desc } = await import("drizzle-orm");

    const [userData, userTasks, userLeads, userAgents, userDocs, userNotifs] = await Promise.all([
      ctx.db.select().from(users).where(eqOp(users.id, ctx.dbUser.id)),
      ctx.db.select().from(tasks).where(eqOp(tasks.tenantId, ctx.tenantId)).limit(1000),
      ctx.db.select().from(leads).where(eqOp(leads.tenantId, ctx.tenantId)).limit(1000),
      ctx.db.select().from(agents).where(eqOp(agents.tenantId, ctx.tenantId)),
      ctx.db.select().from(documents).where(eqOp(documents.tenantId, ctx.tenantId)).limit(1000),
      ctx.db.select().from(notifications).where(eqOp(notifications.tenantId, ctx.tenantId)).limit(500),
    ]);

    await logAudit({
      tenantId: ctx.tenantId,
      userId: ctx.dbUser.id,
      action: "data.exported",
      resource: "rgpd",
    });

    return {
      exportDate: new Date().toISOString(),
      user: userData[0],
      tasks: userTasks,
      leads: userLeads,
      agents: userAgents,
      documents: userDocs,
      notifications: userNotifs,
    };
  }),

  /** Delete account + all tenant data (RGPD droit a l'oubli) */
  deleteAccount: protectedProcedure
    .input(z.object({ confirmEmail: z.string().email() }))
    .mutation(async ({ ctx, input }) => {
      // Verify email matches as confirmation
      if (input.confirmEmail !== ctx.dbUser.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "L'email de confirmation ne correspond pas.",
        });
      }

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.dbUser.id,
        action: "account.deleted",
        resource: "tenant",
        resourceId: ctx.tenantId,
      });

      // Delete tenant (cascade deletes all related data: users, agents, tasks, leads, docs, etc.)
      await ctx.db.delete(tenants).where(eq(tenants.id, ctx.tenantId));

      // Delete Supabase auth user
      try {
        const { createSupabaseAdmin } = await import("@/lib/supabase-server");
        const adminClient = createSupabaseAdmin();
        await adminClient.auth.admin.deleteUser(ctx.dbUser.id);
      } catch {
        // Best effort — auth user cleanup
      }

      return { deleted: true };
    }),
});
