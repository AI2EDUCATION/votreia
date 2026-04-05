import { db } from "@/db";
import { tasks, agents, users } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { Clock, CheckCircle2, XCircle, AlertTriangle, ListTodo } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { Pagination } from "@/components/ui/pagination";
import { SearchInput } from "@/components/ui/search-input";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; agent?: string; page?: string; q?: string }>;
}) {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const params = await searchParams;
  const conditions = [eq(tasks.tenantId, tenantId)];
  if (params.status) {
    conditions.push(eq(tasks.status, params.status as any));
  }
  if (params.q) {
    conditions.push(sql`type ILIKE ${"%" + params.q + "%"}`);
  }

  const PAGE_SIZE = 25;
  const currentPage = Math.max(1, parseInt(params.page ?? "1", 10) || 1);
  const offset = (currentPage - 1) * PAGE_SIZE;

  const [taskList, agentList, stats, totalCount] = await Promise.all([
    db
      .select({
        task: tasks,
        agentName: agents.name,
        agentType: agents.type,
      })
      .from(tasks)
      .leftJoin(agents, eq(tasks.agentId, agents.id))
      .where(and(...conditions))
      .orderBy(desc(tasks.createdAt))
      .limit(PAGE_SIZE)
      .offset(offset),
    db.select().from(agents).where(eq(agents.tenantId, tenantId)),
    db
      .select({
        total: sql<number>`count(*)::int`,
        completed: sql<number>`count(*) filter (where status = 'completed')::int`,
        failed: sql<number>`count(*) filter (where status = 'failed')::int`,
        processing: sql<number>`count(*) filter (where status = 'processing')::int`,
        escalated: sql<number>`count(*) filter (where status = 'escalated')::int`,
      })
      .from(tasks)
      .where(eq(tasks.tenantId, tenantId)),

    // Total count for pagination
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(and(...conditions)),
  ]);

  const s = stats[0];
  const totalPages = Math.ceil((totalCount[0]?.count ?? 0) / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Taches</h1>
          <p className="text-sm text-surface-500 mt-1">
            Historique de toutes les taches traitees par vos agents
          </p>
        </div>
        <Suspense fallback={<div className="w-64 h-10 skeleton rounded-lg" />}>
          <SearchInput placeholder="Rechercher une tache..." basePath="/dashboard/tasks" paramName="q" />
        </Suspense>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Completees" value={s.completed} color="emerald" />
        <StatCard icon={<Clock className="w-4 h-4 text-blue-500" />} label="En cours" value={s.processing} color="blue" />
        <StatCard icon={<XCircle className="w-4 h-4 text-red-500" />} label="Echouees" value={s.failed} color="red" />
        <StatCard icon={<AlertTriangle className="w-4 h-4 text-amber-500" />} label="Escaladees" value={s.escalated} color="amber" />
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        <FilterPill href="/dashboard/tasks" label="Toutes" active={!params.status} count={s.total} />
        <FilterPill href="/dashboard/tasks?status=completed" label="Completees" active={params.status === "completed"} count={s.completed} />
        <FilterPill href="/dashboard/tasks?status=processing" label="En cours" active={params.status === "processing"} count={s.processing} />
        <FilterPill href="/dashboard/tasks?status=failed" label="Echouees" active={params.status === "failed"} count={s.failed} />
        <FilterPill href="/dashboard/tasks?status=escalated" label="Escaladees" active={params.status === "escalated"} count={s.escalated} />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="table-header">
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Statut</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Type</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Agent</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Duree</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Tokens</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Cout</th>
                <th className="text-left px-5 py-3 font-medium text-surface-500 text-xs uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-100 dark:divide-white/[0.04]">
              {taskList.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center">
                    <div className="w-12 h-12 bg-surface-100 dark:bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3">
                      <ListTodo className="w-6 h-6 text-surface-300" />
                    </div>
                    <p className="text-sm text-surface-400">Aucune tache trouvee.</p>
                  </td>
                </tr>
              ) : (
                taskList.map(({ task, agentName, agentType }) => (
                  <tr key={task.id} className="table-row">
                    <td className="px-5 py-3">
                      <TaskStatusBadge status={task.status} />
                    </td>
                    <td className="px-5 py-3 font-medium text-surface-800 dark:text-surface-200">
                      <Link href={`/dashboard/tasks/${task.id}`} className="hover:text-brand-600 dark:hover:text-brand-400 hover:underline">
                        {task.type}
                      </Link>
                    </td>
                    <td className="px-5 py-3 text-surface-600 dark:text-surface-400">
                      {agentName ?? "—"}
                      {agentType && (
                        <span className="text-surface-400 ml-1 text-xs">({agentType})</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-surface-600 dark:text-surface-400 font-mono text-xs tabular-nums">
                      {task.durationMs ? `${(task.durationMs / 1000).toFixed(1)}s` : "—"}
                    </td>
                    <td className="px-5 py-3 text-surface-600 dark:text-surface-400 font-mono text-xs tabular-nums">
                      {task.tokensUsed?.toLocaleString() ?? "—"}
                    </td>
                    <td className="px-5 py-3 text-surface-600 dark:text-surface-400 font-mono text-xs tabular-nums">
                      {task.costCents ? `${(task.costCents / 100).toFixed(2)}€` : "—"}
                    </td>
                    <td className="px-5 py-3 text-surface-400 text-xs tabular-nums">
                      {new Date(task.createdAt).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            baseUrl="/dashboard/tasks"
            searchParams={params.status ? { status: params.status } : {}}
          />
        </div>
      </div>
    </div>
  );
}

const statColors: Record<string, string> = {
  emerald: "bg-emerald-50 dark:bg-emerald-500/10",
  blue: "bg-blue-50 dark:bg-blue-500/10",
  red: "bg-red-50 dark:bg-red-500/10",
  amber: "bg-amber-50 dark:bg-amber-500/10",
};

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${statColors[color] ?? "bg-surface-50"}`}>
        {icon}
      </div>
      <div>
        <div className="text-xl font-bold text-surface-900 dark:text-surface-50">{value}</div>
        <div className="text-xs text-surface-400">{label}</div>
      </div>
    </div>
  );
}

function FilterPill({ href, label, active, count }: { href: string; label: string; active: boolean; count: number }) {
  return (
    <Link
      href={href}
      className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "bg-surface-100 dark:bg-white/5 text-surface-600 dark:text-surface-400 hover:bg-surface-200 dark:hover:bg-white/10"
      }`}
    >
      {label}
      <span className={`text-xs ${active ? "text-white/70" : "text-surface-400"}`}>
        {count}
      </span>
    </Link>
  );
}

function TaskStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: "badge-success",
    failed: "badge-danger",
    escalated: "badge-warning",
    processing: "badge-info",
    pending: "bg-surface-100 text-surface-500 badge dark:bg-white/5 dark:text-surface-400",
  };
  const labels: Record<string, string> = {
    completed: "OK",
    failed: "Erreur",
    escalated: "Escalade",
    processing: "En cours",
    pending: "Attente",
  };
  return <span className={styles[status] ?? styles.pending}>{labels[status] ?? status}</span>;
}
