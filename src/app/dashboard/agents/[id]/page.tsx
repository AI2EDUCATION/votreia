import { db } from "@/db";
import { agents, agentLogs, tasks, users } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { Bot, Clock, CheckCircle2, XCircle, Activity, Zap, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { notFound } from "next/navigation";
import { AgentDetailActions, AgentConfigSection, TriggerTaskButton } from "./client";
import { AgentTaskChart } from "@/components/dashboard/agent-chart";

const agentIcons: Record<string, string> = {
  email: "✉️", commercial: "💼", admin: "📄", support: "🎧", direction: "📊",
};

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const { id } = await params;

  const [agent] = await db
    .select()
    .from(agents)
    .where(and(eq(agents.id, id), eq(agents.tenantId, tenantId)))
    .limit(1);

  if (!agent) notFound();

  const [recentTasks, recentLogs, taskStats, dailyChart] = await Promise.all([
    db.select().from(tasks)
      .where(and(eq(tasks.agentId, id), eq(tasks.tenantId, tenantId)))
      .orderBy(desc(tasks.createdAt)).limit(10),
    db.select().from(agentLogs)
      .where(eq(agentLogs.agentId, id))
      .orderBy(desc(agentLogs.createdAt)).limit(20),
    db.select({
      total: sql<number>`count(*)::int`,
      completed: sql<number>`count(*) filter (where status = 'completed')::int`,
      failed: sql<number>`count(*) filter (where status = 'failed')::int`,
      avgMs: sql<number>`coalesce(avg(duration_ms)::int, 0)`,
      totalCost: sql<number>`coalesce(sum(cost_cents)::int, 0)`,
    }).from(tasks)
      .where(and(eq(tasks.agentId, id), eq(tasks.tenantId, tenantId), sql`created_at >= now() - interval '30 days'`)),

    // Daily chart data (14 days)
    db.execute(sql`
      SELECT
        to_char(date_trunc('day', created_at), 'YYYY-MM-DD') as date,
        count(*) filter (where status = 'completed')::int as completed,
        count(*) filter (where status = 'failed')::int as failed
      FROM tasks
      WHERE tenant_id = ${tenantId}
        AND agent_id = ${id}
        AND created_at >= now() - interval '14 days'
      GROUP BY 1
      ORDER BY 1
    `),
  ]);

  const chartData = (dailyChart as any[]).map((r: any) => ({
    date: String(r.date),
    completed: Number(r.completed ?? 0),
    failed: Number(r.failed ?? 0),
  }));

  const stats = taskStats[0];
  const successRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statusBadge: Record<string, string> = {
    active: "badge-success", paused: "badge-warning", error: "badge-danger", setup: "badge-info",
  };
  const statusLabel: Record<string, string> = {
    active: "Actif", paused: "Pause", error: "Erreur", setup: "Config",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <Breadcrumb items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Agents", href: "/dashboard/agents" },
        { label: agent.name },
      ]} />

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{agentIcons[agent.type] ?? "🤖"}</span>
            <div>
              <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">{agent.name}</h1>
              <p className="text-sm text-surface-500 capitalize">{agent.type}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={statusBadge[agent.status] ?? "badge-info"}>{statusLabel[agent.status] ?? agent.status}</span>
            <AgentDetailActions agentId={agent.id} status={agent.status} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-surface-100 dark:border-white/[0.06]">
          <StatBox icon={<Zap className="w-4 h-4 text-brand-500" />} label="Total taches" value={agent.totalTasks} />
          <StatBox icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="30j completees" value={stats.completed} />
          <StatBox icon={<XCircle className="w-4 h-4 text-red-500" />} label="30j echouees" value={stats.failed} />
          <StatBox icon={<TrendingUp className="w-4 h-4 text-violet-500" />} label="Taux reussite" value={`${successRate}%`} />
          <StatBox icon={<Clock className="w-4 h-4 text-amber-500" />} label="Cout 30j" value={`${(stats.totalCost / 100).toFixed(2)} EUR`} />
        </div>
      </div>

      {/* Config section + Trigger */}
      <div className="flex gap-4 items-start">
        <div className="flex-1">
          <AgentConfigSection
            agent={{
              id: agent.id,
              name: agent.name,
              type: agent.type,
              status: agent.status,
              systemPrompt: agent.systemPrompt,
              config: agent.config,
            }}
          />
        </div>
        {agent.status === "active" && (
          <div className="shrink-0">
            <TriggerTaskButton agentId={agent.id} agentType={agent.type} />
          </div>
        )}
      </div>

      {/* Activity chart */}
      {chartData.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50 mb-4">Activite sur 14 jours</h3>
          <AgentTaskChart data={chartData} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent tasks */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-surface-400" />
              <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50">Taches recentes</h3>
            </div>
            <Link href={`/dashboard/tasks?agent=${id}`} className="text-xs text-brand-600 dark:text-brand-400 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-white/[0.04]">
            {recentTasks.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-surface-400">Aucune tache</div>
            ) : (
              recentTasks.map((t) => (
                <Link key={t.id} href={`/dashboard/tasks/${t.id}`} className="px-5 py-3 flex items-center justify-between table-row block">
                  <div className="flex items-center gap-2">
                    <TaskDot status={t.status} />
                    <span className="text-sm text-surface-800 dark:text-surface-200">{t.type}</span>
                  </div>
                  <span className="text-xs text-surface-400 tabular-nums">
                    {new Date(t.createdAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Recent logs */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06]">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-surface-400" />
              <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50">Journal d'activite</h3>
            </div>
          </div>
          <div className="divide-y divide-surface-100 dark:divide-white/[0.04] max-h-96 overflow-y-auto">
            {recentLogs.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-surface-400">Aucun log</div>
            ) : (
              recentLogs.map((log) => (
                <div key={log.id} className="px-5 py-2.5">
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-mono ${
                      log.level === "error" ? "text-red-600 dark:text-red-400" :
                      log.level === "warning" ? "text-amber-600 dark:text-amber-400" :
                      "text-surface-500"
                    }`}>
                      {log.action}
                    </span>
                    <span className="text-[10px] text-surface-400 tabular-nums">
                      {new Date(log.createdAt).toLocaleString("fr-FR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-surface-400 mb-1">{icon}{label}</div>
      <div className="text-lg font-bold text-surface-900 dark:text-surface-50">{value}</div>
    </div>
  );
}

function TaskDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500", failed: "bg-red-500", escalated: "bg-amber-500",
    processing: "bg-blue-500 animate-pulse", pending: "bg-surface-300",
  };
  return <span className={`w-2 h-2 rounded-full shrink-0 ${colors[status] ?? colors.pending}`} />;
}
