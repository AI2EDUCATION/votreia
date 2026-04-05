import { z } from "zod";
import { router, protectedProcedure } from "../init";
import { notifications } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(20),
        unreadOnly: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(notifications.tenantId, ctx.tenantId)];

      // Show user-specific + tenant-wide (userId null) notifications
      if (input.unreadOnly) {
        conditions.push(eq(notifications.read, false));
      }

      return ctx.db
        .select()
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.sentAt))
        .limit(input.limit);
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    const [result] = await ctx.db
      .select({ count: sql<number>`count(*)::int` })
      .from(notifications)
      .where(
        and(
          eq(notifications.tenantId, ctx.tenantId),
          eq(notifications.read, false)
        )
      );

    return result?.count ?? 0;
  }),

  markRead: protectedProcedure
    .input(z.object({ notificationId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(notifications)
        .set({ read: true })
        .where(
          and(
            eq(notifications.id, input.notificationId),
            eq(notifications.tenantId, ctx.tenantId)
          )
        );
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(notifications)
      .set({ read: true })
      .where(
        and(
          eq(notifications.tenantId, ctx.tenantId),
          eq(notifications.read, false)
        )
      );
    return { success: true };
  }),
});
