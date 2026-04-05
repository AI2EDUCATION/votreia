import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { db } from "@/db";
import { subscriptions, tenants, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { logAudit } from "@/lib/audit";
import { logError } from "@/lib/error-handler";
import { sendEmail, notifyTenantAdmins } from "@/lib/notifications";
import type Stripe from "stripe";

const relevantEvents = new Set([
  "checkout.session.completed",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const sig = headersList.get("stripe-signature")!;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logError(err, { context: "stripe_webhook_signature" });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (!relevantEvents.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;
        const plan = session.metadata?.plan;

        if (tenantId && plan && session.subscription) {
          await db
            .update(tenants)
            .set({
              stripeCustomerId: session.customer as string,
              plan: plan as "essentiel" | "professionnel" | "commande_totale",
            })
            .where(eq(tenants.id, tenantId));

          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          );

          await db.insert(subscriptions).values({
            tenantId,
            stripeSubscriptionId: sub.id,
            plan: plan as "essentiel" | "professionnel" | "commande_totale",
            status: "active",
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
          });

          await logAudit({
            tenantId,
            action: "subscription.created",
            resource: "subscription",
            resourceId: sub.id,
            detail: { plan, customerId: session.customer },
          });

          // Send welcome email
          await notifyTenantAdmins({
            tenantId,
            subject: `[VotrIA] Bienvenue sur le plan ${plan}`,
            html: `<div style="font-family:sans-serif;padding:20px;max-width:560px;margin:0 auto">
              <div style="background:#4c6ef5;color:white;padding:16px 24px;border-radius:12px 12px 0 0">
                <h2 style="margin:0">Bienvenue sur VotrIA ${plan}</h2>
              </div>
              <div style="background:white;border:1px solid #e9ecef;padding:24px;border-radius:0 0 12px 12px">
                <p>Votre abonnement est maintenant actif.</p>
                <p>Vous pouvez configurer vos agents IA depuis votre tableau de bord.</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/agents" style="display:inline-block;background:#4c6ef5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Configurer mes agents</a></p>
              </div>
            </div>`,
            inAppTitle: `Plan ${plan} active`,
            inAppContent: `Votre abonnement ${plan} est maintenant actif. Configurez vos agents.`,
          });
        }
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .update(subscriptions)
          .set({
            status: sub.status as "active" | "past_due" | "canceled",
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
          })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));

        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          await logAudit({
            tenantId,
            action: "subscription.updated",
            resource: "subscription",
            resourceId: sub.id,
            detail: { status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end },
          });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await db
          .update(subscriptions)
          .set({ status: "canceled" })
          .where(eq(subscriptions.stripeSubscriptionId, sub.id));

        const tenantId = sub.metadata?.tenantId;
        if (tenantId) {
          await db
            .update(tenants)
            .set({ plan: "trial" })
            .where(eq(tenants.id, tenantId));

          await logAudit({
            tenantId,
            action: "subscription.canceled",
            resource: "subscription",
            resourceId: sub.id,
          });

          // Notify about downgrade
          await notifyTenantAdmins({
            tenantId,
            subject: "[VotrIA] Votre abonnement a ete annule",
            html: `<div style="font-family:sans-serif;padding:20px;max-width:560px;margin:0 auto">
              <div style="background:#fa5252;color:white;padding:16px 24px;border-radius:12px 12px 0 0">
                <h2 style="margin:0">Abonnement annule</h2>
              </div>
              <div style="background:white;border:1px solid #e9ecef;padding:24px;border-radius:0 0 12px 12px">
                <p>Votre abonnement VotrIA a ete annule. Votre compte est revenu en mode essai.</p>
                <p>Vos agents fonctionneront desormais en mode simulation (sans IA reelle).</p>
                <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing" style="display:inline-block;background:#4c6ef5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reactivez votre plan</a></p>
              </div>
            </div>`,
            inAppTitle: "Abonnement annule",
            inAppContent: "Votre compte est revenu en mode essai. Reactivez votre plan pour utiliser l'IA reelle.",
          });
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        if (invoice.subscription) {
          await db
            .update(subscriptions)
            .set({ status: "active" })
            .where(
              eq(
                subscriptions.stripeSubscriptionId,
                invoice.subscription as string
              )
            );
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;

        if (subId) {
          await db
            .update(subscriptions)
            .set({ status: "past_due" })
            .where(eq(subscriptions.stripeSubscriptionId, subId));

          // Find the tenant
          const [sub] = await db
            .select({ tenantId: subscriptions.tenantId })
            .from(subscriptions)
            .where(eq(subscriptions.stripeSubscriptionId, subId))
            .limit(1);

          if (sub) {
            await logAudit({
              tenantId: sub.tenantId,
              action: "payment.failed",
              resource: "invoice",
              detail: { invoiceId: invoice.id, amountDue: invoice.amount_due },
            });

            await notifyTenantAdmins({
              tenantId: sub.tenantId,
              subject: "[VotrIA] Echec de paiement — Action requise",
              html: `<div style="font-family:sans-serif;padding:20px;max-width:560px;margin:0 auto">
                <div style="background:#fd7e14;color:white;padding:16px 24px;border-radius:12px 12px 0 0">
                  <h2 style="margin:0">Echec de paiement</h2>
                </div>
                <div style="background:white;border:1px solid #e9ecef;padding:24px;border-radius:0 0 12px 12px">
                  <p>Le paiement de votre abonnement VotrIA a echoue.</p>
                  <p>Veuillez mettre a jour votre moyen de paiement pour eviter une interruption de service.</p>
                  <p><a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard/billing" style="display:inline-block;background:#4c6ef5;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Mettre a jour le paiement</a></p>
                </div>
              </div>`,
              inAppTitle: "Echec de paiement",
              inAppContent: "Mettez a jour votre moyen de paiement pour eviter une interruption de service.",
            });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    logError(err, { context: "stripe_webhook_processing", eventType: event.type });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
