import { db } from "@/db";
import { tasks, agents, leads, users, tenants } from "@/db/schema";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { BarChart3, TrendingUp, Zap, CreditCard, Bot, Users as UsersIcon, Target, Clock } from "lucide-react";
import { AgentTaskChart } from "@/components/dashboard/agent-chart";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

export default async function AnalyticsPage() {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const [
    overallStats,
    dailyTasks,
    agentPerformance,
    costByAgent,
    leadFunnel,
    topTaskTypes,
  ] = await Promise.all([
    // Overall stats (30 days)
    db.select({
      totalTasks: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      escalated: sql<number>`count(*) filter (where status = 'escalated')::int`,
      avgDurationMs: sql<number>`coalesce(avg(duration_ms)::int, 0)`,
      totalTokens: sql<number>`coalesce(sum(tokens_used)::int, 0)`,
      totalCostCents: sql<number>`coalesce(sum(cost_cents)::int, 0)`,
    }).from(tasks)
      .where(and(eq(tasks.tenantId, tenantId), gte(tasks.createdAt, sql`now() - interval '30 days'`))),

    // Daily task counts (14 days)
    db.execute(sql`
      SELECT
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
        count(*) filter (where status = 'completed')::int as completed,
        count(*) filter (where status = 'failed')::int as failed
      FROM tasks
      WHERE tenant_id = ${tenantId}
        AND created_at >= now() - interval '14 days'
      GROUP BY 1
      ORDER BY 1
    `),

    // Per-agent performance
    db.select({
      agentId: agents.id,
      agentName: agents.name,
      agentType: agents.type,
      agentStatus: agents.status,
      totalTasks: sql<number>`count(t.id)::int`,
      completed: sql<number>`count(t.id) filter (where t.status = 'completed')::int`,
      failed: sql<number>`count(t.id) filter (where t.status = 'failed')::int`,
      avgMs: sql<number>`coalesce(avg(t.duration_ms)::int, 0)`,
      costCents: sql<number>`coalesce(sum(t.cost_cents)::int, 0)`,
    }).from(agents)
      .leftJoin(sql`tasks t`, sql`t.agent_id = ${agents.id} AND t.created_at >= now() - interval '30 days'`)
      .where(eq(agents.tenantId, tenantId))
      .groupBy(agents.id, agents.name, agents.type, agents.status),

    // Cost by agent type
    db.execute(sql`
      SELECT
        a.type as agent_type,
        count(t.id)::int as task_count,
        coalesce(sum(t.cost_cents)::int, 0) as cost_cents,
        coalesce(sum(t.tokens_used)::int, 0) as tokens_used
      FROM agents a
      LEFT JOIN tasks t ON t.agent_id = a.id AND t.created_at >= now() - interval '30 days'
      WHERE a.tenant_id = ${tenantId}
      GROUP BY a.type
      ORDER BY cost_cents DESC
    `),

    // Lead funnel
    db.select({
      status: leads.status,
      count: sql<number>`count(*)::int`,
    }).from(leads)
      .where(eq(leads.tenantId, tenantId))
      .groupBy(leads.status),

    // Top task types
    db.execute(sql`
      SELECT type, count(*)::int as count, avg(duration_ms)::int as avg_ms
      FROM tasks
      WHERE tenant_id = ${tenantId} AND created_at >= now() - interval '30 days'
      GROUP BY type
      ORDER BY count DESC
      LIMIT 8
    `),
  ]);

  const stats = overallStats[0];
  const successRate = stats.totalTasks > 0 ? Math.round((stats.completed / stats.totalTasks) * 100) : 0;

  const chartData = (dailyTasks as any[]).map((r: any) => ({
    date: String(r.date),
    completed: Number(r.completed ?? 0),
    failed: Number(r.failed ?? 0),
  }));

  const funnelData: Record<string, number> = {};
  for (const row of leadFunnel) {
    funnelData[row.status] = row.count;
  }

  const agentIcons: Record<string, string> = {
    email: "✉️", commercial: "💼", admin: "📄", support: "🎧", direction: "📊",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Analytics</h1>
        <p className="text-sm text-surface-500 mt-1">Vue d'ensemble des 30 derniers jours</p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
        <KPI icon={<Zap className="w-5 h-5" />} label="Taches totales" value={stats.totalTasks.toLocaleString()} color="brand" />
        <KPI icon={<TrendingUp className="w-5 h-5" />} label="Taux de reussite" value={`${successRate}%`} color="emerald" />
        <KPI icon={<Clock className="w-5 h-5" />} label="Duree moyenne" value={`${(stats.avgDurationMs / 1000).toFixed(1)}s`} color="violet" />
        <KPI icon={<CreditCard className="w-5 h-5" />} label="Cout total" value={`${(stats.totalCostCents / 100).toFixed(2)} EUR`} color="amber" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily activity */}
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50 mb-4">Activite quotidienne</h3>
          <AgentTaskChart data={chartData} />
        </div>

        {/* Lead funnel */}
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50 mb-4">Pipeline leads</h3>
          <LeadFunnel data={funnelData} />
        </div>
      </div>

      {/* Agent performance table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06] flex items-center gap-2">
          <Bot className="w-4 h-4 text-surface-400" />
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50">Performance par agent</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Agent</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Taches</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Reussite</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Duree moy.</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Cout</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-surface-500 uppercase tracking-wider">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-white/[0.04]">
              {agentPerformance.map((a) => {
                const rate = a.totalTasks > 0 ? Math.round((a.completed / a.totalTasks) * 100) : 0;
                return (
                  <tr key={a.agentId} className="table-row">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{agentIcons[a.agentType] ?? "🤖"}</span>
                        <div>
                          <div className="font-medium text-surface-800 dark:text-surface-200">{a.agentName}</div>
                          <div className="text-xs text-surface-400 capitalize">{a.agentType}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs tabular-nums">{a.totalTasks}</td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-12 h-1.5 bg-surface-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${rate >= 90 ? "bg-emerald-500" : rate >= 70 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${rate}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-surface-600 dark:text-surface-400">{rate}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs tabular-nums text-surface-600 dark:text-surface-400">
                      {a.avgMs > 0 ? `${(a.avgMs / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs tabular-nums text-surface-600 dark:text-surface-400">
                      {(a.costCents / 100).toFixed(2)} EUR
                    </td>
                    <td className="px-5 py-3">
                      <AgentStatusBadge status={a.agentStatus} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cost breakdown + Top tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost by agent type */}
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50 mb-4">Cout par type d'agent</h3>
          <div className="space-y-3">
            {(costByAgent as any[]).map((row: any) => {
              const cost = Number(row.cost_cents ?? 0);
              const maxCost = Math.max(...(costByAgent as any[]).map((r: any) => Number(r.cost_cents ?? 0)), 1);
              return (
                <div key={row.agent_type}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-surface-700 dark:text-surface-300 capitalize flex items-center gap-1.5">
                      {agentIcons[row.agent_type] ?? "🤖"} {row.agent_type}
                    </span>
                    <span className="text-xs font-mono text-surface-500 tabular-nums">{(cost / 100).toFixed(2)} EUR</span>
                  </div>
                  <div className="w-full h-2 bg-surface-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${(cost / maxCost) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top task types */}
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50 mb-4">Types de taches les plus executees</h3>
          <div className="space-y-2">
            {(topTaskTypes as any[]).map((row: any, i: number) => (
              <div key={row.type} className="flex items-center justify-between py-2 border-b border-surface-100 dark:border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded bg-surface-100 dark:bg-white/5 flex items-center justify-center text-[10px] font-bold text-surface-400">{i + 1}</span>
                  <span className="text-sm text-surface-800 dark:text-surface-200 font-mono">{row.type}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-surface-400 tabular-nums">
                  <span>{row.count}x</span>
                  <span>{row.avg_ms ? `${(Number(row.avg_ms) / 1000).toFixed(1)}s` : "—"}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components

function KPI({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colors: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };
  return (
    <div className="stat-card">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
      <div className="stat-value mt-3">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function AgentStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = { active: "badge-success", paused: "badge-warning", error: "badge-danger", setup: "badge-info" };
  const labels: Record<string, string> = { active: "Actif", paused: "Pause", error: "Erreur", setup: "Config" };
  return <span className={styles[status] ?? "badge-info"}>{labels[status] ?? status}</span>;
}

function LeadFunnel({ data }: { data: Record<string, number> }) {
  const stages = [
    { key: "new", label: "Nouveau", color: "bg-blue-500" },
    { key: "contacted", label: "Contacte", color: "bg-violet-500" },
    { key: "qualified", label: "Qualifie", color: "bg-emerald-500" },
    { key: "proposal", label: "Proposition", color: "bg-amber-500" },
    { key: "won", label: "Gagne", color: "bg-green-500" },
    { key: "lost", label: "Perdu", color: "bg-red-400" },
  ];

  const max = Math.max(...stages.map((s) => data[s.key] ?? 0), 1);

  return (
    <div className="space-y-2.5">
      {stages.map((stage) => {
        const count = data[stage.key] ?? 0;
        const pct = (count / max) * 100;
        return (
          <div key={stage.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-surface-600 dark:text-surface-400">{stage.label}</span>
              <span className="text-xs font-mono text-surface-500 tabular-nums">{count}</span>
            </div>
            <div className="w-full h-2.5 bg-surface-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${stage.color} transition-all`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
