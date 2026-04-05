import { db } from "@/db";
import { agents, tasks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { users } from "@/db/schema";
import { Bot, Plus, Settings, BarChart3, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { AgentPageClient, AgentCardActions, AgentEmptyState } from "./client";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

const agentMeta: Record<string, { icon: string; gradient: string; desc: string; bgGlow: string }> = {
  email: { icon: "✉️", gradient: "from-blue-500/20 via-blue-400/5 to-transparent", desc: "Trie, repond et escalade vos emails automatiquement", bgGlow: "bg-blue-500" },
  commercial: { icon: "💼", gradient: "from-emerald-500/20 via-emerald-400/5 to-transparent", desc: "Qualifie vos leads, envoie devis et relances", bgGlow: "bg-emerald-500" },
  admin: { icon: "📄", gradient: "from-amber-500/20 via-amber-400/5 to-transparent", desc: "Classe documents, extrait donnees, archive", bgGlow: "bg-amber-500" },
  support: { icon: "🎧", gradient: "from-violet-500/20 via-violet-400/5 to-transparent", desc: "Repond aux clients 24/7, cree des tickets", bgGlow: "bg-violet-500" },
  direction: { icon: "📊", gradient: "from-rose-500/20 via-rose-400/5 to-transparent", desc: "Bilans quotidiens, suivi decisions, alertes", bgGlow: "bg-rose-500" },
};

export default async function AgentsPage() {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const agentList = await db.select().from(agents).where(eq(agents.tenantId, tenantId));

  const taskCounts = await db
    .select({
      agentId: tasks.agentId,
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
    })
    .from(tasks)
    .where(
      and(
        eq(tasks.tenantId, tenantId),
        sql`created_at >= now() - interval '7 days'`
      )
    )
    .groupBy(tasks.agentId);

  const countMap = new Map(taskCounts.map((tc) => [tc.agentId, tc]));

  return (
    <div className="space-y-6">
      <AgentPageClient agentCount={agentList.length} />

      {agentList.length === 0 ? (
        <AgentEmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 stagger-children">
          {agentList.map((agent) => {
            const meta = agentMeta[agent.type] ?? agentMeta.email;
            const tc = countMap.get(agent.id);
            const successRate = tc && tc.total > 0
              ? Math.round((tc.completed / tc.total) * 100)
              : null;

            return (
              <div key={agent.id} className="card-hover group relative overflow-hidden">
                {/* Gradient glow */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${meta.bgGlow} opacity-60`} />
                <div className={`absolute inset-0 bg-gradient-to-b ${meta.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                <div className="relative p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{meta.icon}</span>
                      <div>
                        <Link href={`/dashboard/agents/${agent.id}`}>
                          <h3 className="font-semibold text-surface-900 dark:text-surface-50 hover:text-brand-600 dark:hover:text-brand-400">{agent.name}</h3>
                        </Link>
                        <p className="text-xs text-surface-400 capitalize">{agent.type}</p>
                      </div>
                    </div>
                    <StatusBadge status={agent.status} />
                  </div>

                  <p className="text-sm text-surface-500 dark:text-surface-400 mb-3 leading-relaxed">{meta.desc}</p>

                  {agent.status === "setup" && (
                    <Link
                      href={`/dashboard/agents/${agent.id}/setup`}
                      className="flex items-center gap-2 mb-3 p-2.5 rounded-lg bg-brand-50 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/10 text-sm text-brand-700 dark:text-brand-300 font-medium hover:bg-brand-100 dark:hover:bg-brand-500/10 transition-colors"
                    >
                      <Zap className="w-4 h-4" />
                      Terminer la configuration →
                    </Link>
                  )}

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-5">
                    <StatBox label="Total" value={agent.totalTasks} />
                    <StatBox label="7 jours" value={tc?.total ?? 0} />
                    <StatBox label="Reussite" value={successRate !== null ? `${successRate}%` : "—"} highlight={successRate !== null && successRate >= 90} />
                  </div>

                  {/* Actions — client component */}
                  <AgentCardActions
                    agentId={agent.id}
                    status={agent.status}
                    agent={{
                      id: agent.id,
                      name: agent.name,
                      type: agent.type,
                      systemPrompt: agent.systemPrompt,
                      config: agent.config,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className="text-center py-2.5 rounded-lg bg-surface-50 dark:bg-white/[0.03]">
      <div className={`text-lg font-bold ${highlight ? "text-emerald-600 dark:text-emerald-400" : "text-surface-900 dark:text-surface-50"}`}>
        {value}
      </div>
      <div className="text-xs text-surface-400 mt-0.5">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "badge-success",
    paused: "badge-warning",
    error: "badge-danger",
    setup: "badge-info",
  };
  const labels: Record<string, string> = {
    active: "Actif",
    paused: "Pause",
    error: "Erreur",
    setup: "Config",
  };
  return <span className={styles[status] ?? "badge-info"}>{labels[status] ?? status}</span>;
}

// EmptyState moved to client.tsx as AgentEmptyState (needs onClick for modal)
