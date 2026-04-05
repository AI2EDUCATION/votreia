import { db } from "@/db";
import { leads, users } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { Plus, Users, TrendingUp, Trophy, Target } from "lucide-react";
import { LeadsPageClient } from "./client";
import Link from "next/link";
import { Suspense } from "react";
import { SearchInput } from "@/components/ui/search-input";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

const statusConfig: Record<string, { label: string; light: string; dark: string }> = {
  new: { label: "Nouveau", light: "bg-blue-50 text-blue-700 ring-blue-200", dark: "dark:bg-blue-500/10 dark:text-blue-400 dark:ring-blue-500/20" },
  contacted: { label: "Contacte", light: "bg-violet-50 text-violet-700 ring-violet-200", dark: "dark:bg-violet-500/10 dark:text-violet-400 dark:ring-violet-500/20" },
  qualified: { label: "Qualifie", light: "bg-emerald-50 text-emerald-700 ring-emerald-200", dark: "dark:bg-emerald-500/10 dark:text-emerald-400 dark:ring-emerald-500/20" },
  proposal: { label: "Proposition", light: "bg-amber-50 text-amber-700 ring-amber-200", dark: "dark:bg-amber-500/10 dark:text-amber-400 dark:ring-amber-500/20" },
  won: { label: "Gagne", light: "bg-green-50 text-green-700 ring-green-200", dark: "dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20" },
  lost: { label: "Perdu", light: "bg-red-50 text-red-700 ring-red-200", dark: "dark:bg-red-500/10 dark:text-red-400 dark:ring-red-500/20" },
};

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const params = await searchParams;
  const searchQuery = params.q?.toLowerCase();

  const [allLeads, stats] = await Promise.all([
    db.select().from(leads).where(eq(leads.tenantId, tenantId)).orderBy(desc(leads.createdAt)).limit(200),
    db
      .select({
        total: sql<number>`count(*)::int`,
        avgScore: sql<number>`coalesce(avg(score)::int, 0)`,
        wonValue: sql<number>`count(*) filter (where status = 'won')::int`,
      })
      .from(leads)
      .where(eq(leads.tenantId, tenantId)),
  ]);

  // Client-side search filter
  const leadList = searchQuery
    ? allLeads.filter((l) =>
        [l.firstName, l.lastName, l.email, l.company, l.source]
          .filter(Boolean)
          .some((v) => v!.toLowerCase().includes(searchQuery))
      )
    : allLeads;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Leads</h1>
          <p className="text-sm text-surface-500 mt-1">
            Pipeline commercial alimente par vos agents IA
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense fallback={<div className="w-64 h-10 skeleton rounded-lg" />}>
            <SearchInput placeholder="Rechercher un lead..." basePath="/dashboard/leads" />
          </Suspense>
          <LeadsPageClient />
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-brand-600 dark:text-brand-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-surface-900 dark:text-surface-50">{stats[0].total}</div>
            <div className="text-xs text-surface-400">Total leads</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-surface-900 dark:text-surface-50">{stats[0].avgScore}<span className="text-sm text-surface-400">/100</span></div>
            <div className="text-xs text-surface-400">Score moyen</div>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats[0].wonValue}</div>
            <div className="text-xs text-surface-400">Gagnes</div>
          </div>
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {(["new", "contacted", "qualified", "proposal", "won", "lost"] as const).map((status) => {
          const count = leadList.filter((l) => l.status === status).length;
          const config = statusConfig[status];
          return (
            <div
              key={status}
              className={`shrink-0 px-4 py-2 rounded-lg ring-1 text-sm font-medium ${config.light} ${config.dark}`}
            >
              {config.label} ({count})
            </div>
          );
        })}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Nom</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Entreprise</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Email</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Statut</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Score</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Source</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-white/[0.04]">
              {leadList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="w-12 h-12 bg-surface-100 dark:bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Users className="w-6 h-6 text-surface-300" />
                    </div>
                    <p className="text-sm text-surface-400 mb-1">Aucun lead</p>
                    <p className="text-xs text-surface-400">Les agents commerciaux alimenteront votre pipeline.</p>
                  </td>
                </tr>
              ) : (
                leadList.map((lead) => {
                  const config = statusConfig[lead.status] ?? statusConfig.new;
                  return (
                    <tr key={lead.id} className="table-row cursor-pointer">
                      <td className="px-5 py-3">
                        <Link href={`/dashboard/leads/${lead.id}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(lead.firstName?.[0] ?? "?").toUpperCase()}
                          </div>
                          <span className="font-medium text-surface-800 dark:text-surface-200 hover:text-brand-600 dark:hover:text-brand-400">
                            {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-5 py-3 text-surface-600 dark:text-surface-400">{lead.company ?? "—"}</td>
                      <td className="px-5 py-3 text-surface-500 dark:text-surface-400 text-xs font-mono">{lead.email ?? "—"}</td>
                      <td className="px-5 py-3">
                        <span className={`badge ring-1 ${config.light} ${config.dark}`}>
                          {config.label}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <ScoreBar score={lead.score ?? 0} />
                      </td>
                      <td className="px-5 py-3 text-surface-400 text-xs">{lead.source ?? "—"}</td>
                      <td className="px-5 py-3 text-surface-400 text-xs tabular-nums">
                        {new Date(lead.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-amber-500" : "bg-surface-300 dark:bg-surface-600";
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 bg-surface-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs text-surface-500 font-mono tabular-nums w-6">{score}</span>
    </div>
  );
}
