import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2025-02-24.acacia",
      typescript: true,
    });
  }
  return _stripe;
}

/** @deprecated Use getStripe() */
export const stripe = new Proxy({} as Stripe, {
  get(_, prop) {
    return (getStripe() as any)[prop];
  },
});

// ============================================
// Plans VotrIA (from architecture doc)
// ============================================
export const PLANS = {
  essentiel: {
    name: "Essentiel",
    priceMonthly: 990_00, // cents
    agents: 1,
    tasksPerDay: 50,
    setupFee: 2500_00,
    features: [
      "1 agent IA au choix",
      "50 tâches/jour",
      "Dashboard temps réel",
      "Support email",
      "Rapports hebdomadaires",
    ],
  },
  professionnel: {
    name: "Professionnel",
    priceMonthly: 1900_00,
    agents: 3,
    tasksPerDay: 150,
    setupFee: 5000_00,
    features: [
      "3 agents IA",
      "150 tâches/jour",
      "Dashboard + analytics",
      "Support prioritaire",
      "Rapports quotidiens",
      "Intégration CRM",
    ],
  },
  commande_totale: {
    name: "Commande Totale",
    priceMonthly: null, // custom
    agents: 5,
    tasksPerDay: 500,
    setupFee: null,
    features: [
      "5 agents IA",
      "Volume illimité",
      "Account manager dédié",
      "SLA garanti",
      "API access",
      "Formation équipe",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

export async function createCheckoutSession(params: {
  tenantId: string;
  plan: PlanKey;
  email: string;
  successUrl: string;
  cancelUrl: string;
}) {
  const planConfig = PLANS[params.plan];
  if (!planConfig.priceMonthly) {
    throw new Error("Plan Commande Totale requires custom pricing");
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: params.email,
    mode: "subscription",
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: planConfig.priceMonthly,
          recurring: { interval: "month" },
          product_data: { name: `VotrIA ${planConfig.name}` },
        },
        quantity: 1,
      },
    ],
    subscription_data: {
      metadata: { tenantId: params.tenantId, plan: params.plan },
    },
    metadata: { tenantId: params.tenantId, plan: params.plan },
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session;
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}
