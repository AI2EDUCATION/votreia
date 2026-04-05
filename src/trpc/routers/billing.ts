import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, adminProcedure } from "../init";
import { subscriptions, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createCheckoutSession, createCustomerPortalSession } from "@/lib/stripe";
import { logAudit } from "@/lib/audit";

export const billingRouter = router({
  current: protectedProcedure.query(async ({ ctx }) => {
    const [sub] = await ctx.db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.tenantId, ctx.tenantId))
      .limit(1);

    return sub ?? null;
  }),

  createCheckout: adminProcedure
    .input(
      z.object({
        plan: z.enum(["essentiel", "professionnel"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await createCheckoutSession({
        tenantId: ctx.tenantId,
        plan: input.plan,
        email: ctx.dbUser.email,
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?success=true`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing?canceled=true`,
      });

      await logAudit({
        tenantId: ctx.tenantId,
        userId: ctx.dbUser.id,
        action: "checkout.initiated",
        resource: "billing",
        detail: { plan: input.plan },
      });

      return { url: session.url };
    }),

  portalUrl: adminProcedure.mutation(async ({ ctx }) => {
    const [tenant] = await ctx.db
      .select()
      .from(tenants)
      .where(eq(tenants.id, ctx.tenantId))
      .limit(1);

    if (!tenant?.stripeCustomerId) {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "Aucun abonnement Stripe trouve. Souscrivez d'abord a un plan.",
      });
    }

    const session = await createCustomerPortalSession(
      tenant.stripeCustomerId,
      `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing`
    );

    return { url: session.url };
  }),
});
