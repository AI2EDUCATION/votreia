import { db } from "@/db";
import { subscriptions, tenants, users, tasks } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { CreditCard, CheckCircle, ArrowUpRight, Zap, Crown, Sparkles, Star } from "lucide-react";
import Link from "next/link";
import { CheckoutButton, PortalButton, ContactButton } from "@/components/dashboard/billing-actions";

async function getData() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!dbUser) return null;

  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, dbUser.tenantId)).limit(1);
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, dbUser.tenantId)).limit(1);

  const [usage] = await db
    .select({
      totalTasks: sql<number>`count(*)::int`,
      totalCost: sql<number>`coalesce(sum(cost_cents)::int, 0)`,
    })
    .from(tasks)
    .where(eq(tasks.tenantId, dbUser.tenantId));

  return { tenant, sub, usage, tenantId: dbUser.tenantId };
}

const plans = [
  {
    key: "essentiel",
    name: "Essentiel",
    price: "990",
    period: "/mois",
    setup: "2 500 EUR setup",
    features: ["1 agent IA au choix", "50 taches/jour", "Dashboard temps reel", "Support email", "Rapports hebdomadaires"],
    icon: Zap,
    gradient: "from-brand-500 to-brand-600",
  },
  {
    key: "professionnel",
    name: "Professionnel",
    price: "1 900",
    period: "/mois",
    setup: "5 000 EUR setup",
    popular: true,
    features: ["3 agents IA", "150 taches/jour", "Dashboard + analytics", "Support prioritaire", "Rapports quotidiens", "Integration CRM"],
    icon: Crown,
    gradient: "from-emerald-500 to-emerald-600",
  },
  {
    key: "commande_totale",
    name: "Commande Totale",
    price: "Sur mesure",
    period: "",
    setup: "Sur devis",
    features: ["5 agents IA", "Volume illimite", "Account manager dedie", "SLA garanti", "API access", "Formation equipe"],
    icon: Star,
    gradient: "from-amber-500 to-amber-600",
  },
];

export default async function BillingPage() {
  const data = await getData();
  if (!data) return null;

  const { tenant, sub, usage } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Facturation</h1>
        <p className="text-sm text-surface-500 mt-1">
          Gerez votre abonnement et consultez votre consommation
        </p>
      </div>

      {/* Current plan info */}
      <div className="card overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-surface-900 dark:text-surface-50">Plan actuel</h3>
                  <p className="text-sm text-surface-500">
                    {tenant?.plan === "trial"
                      ? "Periode d'essai gratuit"
                      : `Plan ${tenant?.plan ?? "—"}`}
                  </p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-surface-900 dark:text-surface-50">
                {((usage?.totalCost ?? 0) / 100).toFixed(2)}€
              </div>
              <div className="text-xs text-surface-400">
                {usage?.totalTasks ?? 0} taches traitees
              </div>
            </div>
          </div>
        </div>

        {sub && (
          <div className="px-6 py-4 border-t border-surface-100 dark:border-white/[0.06] bg-surface-50/50 dark:bg-white/[0.02] flex items-center justify-between">
            <span className="text-sm text-surface-500">
              Prochaine facturation :{" "}
              <span className="font-medium text-surface-700 dark:text-surface-300">
                {sub.currentPeriodEnd
                  ? new Date(sub.currentPeriodEnd).toLocaleDateString("fr-FR")
                  : "—"}
              </span>
            </span>
            <PortalButton />
          </div>
        )}

        {tenant?.plan === "trial" && (
          <div className="px-6 py-4 border-t border-brand-100 dark:border-brand-500/10 bg-brand-50/50 dark:bg-brand-500/5 flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-brand-500 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-brand-700 dark:text-brand-300">
                Mode essai actif
              </p>
              <p className="text-xs text-brand-600/70 dark:text-brand-400/70">
                Passez a un plan payant pour activer l'IA reelle et debloquer toutes les fonctionnalites.
              </p>
            </div>
            <Link href="#plans" className="btn-primary text-sm shrink-0">
              Choisir un plan
            </Link>
          </div>
        )}
      </div>

      {/* Plan cards */}
      <div id="plans" className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = tenant?.plan === plan.key;
          const Icon = plan.icon;
          return (
            <div
              key={plan.key}
              className={`card relative overflow-hidden transition-all ${
                plan.popular ? "ring-2 ring-brand-500 dark:ring-brand-400" : ""
              } ${isCurrent ? "bg-brand-50/30 dark:bg-brand-500/5" : ""}`}
            >
              {/* Top accent */}
              <div className={`h-1 bg-gradient-to-r ${plan.gradient}`} />

              {plan.popular && (
                <div className="absolute top-4 right-4">
                  <span className="badge bg-gradient-to-r from-brand-500 to-brand-600 text-white border-0 shadow-sm">
                    Populaire
                  </span>
                </div>
              )}

              <div className="p-6">
                <div className="w-10 h-10 rounded-xl bg-surface-100 dark:bg-white/[0.06] flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-surface-600 dark:text-surface-300" />
                </div>

                <h3 className="text-lg font-bold text-surface-900 dark:text-surface-50">{plan.name}</h3>
                <div className="mt-2 mb-1">
                  <span className="text-3xl font-bold text-surface-900 dark:text-surface-50">{plan.price}</span>
                  {plan.period && <span className="text-surface-500 text-sm">{plan.period}</span>}
                </div>
                <p className="text-xs text-surface-400 mb-6">{plan.setup}</p>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-surface-600 dark:text-surface-400">
                      <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <div className="btn-secondary w-full text-sm justify-center opacity-60 cursor-default">
                    Plan actuel
                  </div>
                ) : plan.key === "commande_totale" ? (
                  <ContactButton />
                ) : (
                  <CheckoutButton plan={plan.key as "essentiel" | "professionnel"} />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
