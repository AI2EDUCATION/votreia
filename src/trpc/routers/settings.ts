import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logAudit } from "@/lib/audit";

export const settingsRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    const [tenant] = await ctx.db
      .select({
        name: tenants.name,
        slug: tenants.slug,
        plan: tenants.plan,
        settings: tenants.settings,
      })
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    return tenant ?? null;
  }),

  update: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(200).optional(),
        settings: z
          .object({
            timezone: z.string().optional(),
            language: z.string().optional(),
            domain: z.string().optional(),
            notificationPreferences: z
              .object({
                email: z.boolean().optional(),
                sms: z.boolean().optional(),
                dailyDigest: z.boolean().optional(),
                browserNotifications: z.boolean().optional(),
                weeklyReport: z.boolean().optional(),
              })
              .optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Merge settings with existing
      const [current] = await ctx.db
        .select({ settings: tenants.settings })
        .from(tenants)
        .where(eq(tenants.id, ctx.tenantId))
        .limit(1);

      const currentSettings = (current?.settings ?? {}) as Record<string, unknown>;
      const newSettings = input.settings
        ? {
            ...currentSettings,
            ...input.settings,
            notificationPreferences: {
              ...((currentSettings.notificationPreferences as Record<string, unknown>) ?? {}),
              ...(input.settings.notificationPreferences ?? {}),
            },
          }
        : currentSettings;

      const updateData: Record<string, unknown> = { settings: newSettings };
      if (input.name) updateData.name = input.name;

      const [updated] = await ctx.db
        .update(tenants)
        .set(updateData)
        .where(eq(tenants.id, ctx.tenantId))
        .returning();

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.dbUser.id,
        action: "settings.updated",
        resource: "tenant",
        resourceId: ctx.tenantId,
        detail: { updatedName: !!input.name, updatedSettings: !!input.settings },
      });

      return updated;
    }),
});
