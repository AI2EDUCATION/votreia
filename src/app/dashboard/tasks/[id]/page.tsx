import { db } from "@/db";
import { tasks, agents, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createSupabaseServer } from "@/lib/supabase-server";
import { Clock, Cpu, CreditCard, Bot, Calendar, CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { CopyButton } from "@/components/ui/copy-button";
import { notFound } from "next/navigation";

async function getTenantId() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const [dbUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  return dbUser?.tenantId ?? null;
}

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const tenantId = await getTenantId();
  if (!tenantId) return null;

  const { id } = await params;

  const [task] = await db
    .select({ task: tasks, agentName: agents.name, agentType: agents.type })
    .from(tasks)
    .leftJoin(agents, eq(tasks.agentId, agents.id))
    .where(and(eq(tasks.id, id), eq(tasks.tenantId, tenantId)))
    .limit(1);

  if (!task) notFound();

  const t = task.task;
  const output = t.output as Record<string, unknown> | null;
  const input = t.input as Record<string, unknown> | null;

  const statusConfig: Record<string, { icon: React.ReactNode; badge: string; label: string }> = {
    completed: { icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />, badge: "badge-success", label: "Completee" },
    failed: { icon: <XCircle className="w-5 h-5 text-red-500" />, badge: "badge-danger", label: "Echouee" },
    escalated: { icon: <AlertTriangle className="w-5 h-5 text-amber-500" />, badge: "badge-warning", label: "Escaladee" },
    processing: { icon: <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />, badge: "badge-info", label: "En cours" },
    pending: { icon: <Clock className="w-5 h-5 text-surface-400" />, badge: "badge bg-surface-100 text-surface-500", label: "En attente" },
  };

  const status = statusConfig[t.status] ?? statusConfig.pending;

  return (
    <div className="space-y-6 max-w-4xl">
      <Breadcrumb items={[
        { label: "Dashboard", href: "/dashboard" },
        { label: "Taches", href: "/dashboard/tasks" },
        { label: t.type },
      ]} />

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {status.icon}
            <div>
              <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50">{t.type}</h1>
              <p className="text-sm text-surface-500 mt-0.5">
                ID: <span className="font-mono text-xs">{t.id.slice(0, 8)}</span>
              </p>
            </div>
          </div>
          <span className={status.badge}>{status.label}</span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-surface-100 dark:border-white/[0.06]">
          <Metric icon={<Bot className="w-4 h-4" />} label="Agent" value={task.agentName ?? "—"} sub={task.agentType ?? ""} />
          <Metric icon={<Clock className="w-4 h-4" />} label="Duree" value={t.durationMs ? `${(t.durationMs / 1000).toFixed(1)}s` : "—"} />
          <Metric icon={<Cpu className="w-4 h-4" />} label="Tokens" value={t.tokensUsed?.toLocaleString() ?? "0"} sub={t.modelUsed?.split("-").slice(0, 2).join(" ") ?? ""} />
          <Metric icon={<CreditCard className="w-4 h-4" />} label="Cout" value={t.costCents ? `${(t.costCents / 100).toFixed(2)} EUR` : "0 EUR"} />
        </div>

        <div className="flex items-center gap-4 pt-4 mt-4 border-t border-surface-100 dark:border-white/[0.06] text-xs text-surface-400">
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Creee: {new Date(t.createdAt).toLocaleString("fr-FR")}
          </div>
          {t.completedAt && (
            <div className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Terminee: {new Date(t.completedAt).toLocaleString("fr-FR")}
            </div>
          )}
          {output?.isSimulated === true && (
            <span className="badge bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">Simulation</span>
          )}
        </div>
      </div>

      {/* Input */}
      {input && Object.keys(input).length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-100 dark:border-white/[0.06] bg-surface-50 dark:bg-white/[0.02] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50">Entree</h3>
            <CopyButton text={JSON.stringify(input, null, 2)} />
          </div>
          <pre className="p-5 text-xs font-mono text-surface-600 dark:text-surface-400 overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(input, null, 2)}
          </pre>
        </div>
      )}

      {/* Output */}
      {output && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-surface-100 dark:border-white/[0.06] bg-surface-50 dark:bg-white/[0.02] flex items-center justify-between">
            <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50">Resultat</h3>
            <CopyButton text={JSON.stringify(output, null, 2)} />
          </div>
          <div className="p-5">
            {Boolean(output.text) && (
              <div className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap leading-relaxed mb-4">
                {String(output.text)}
              </div>
            )}
            {Array.isArray(output.toolResults) && output.toolResults.length > 0 && (
              <div className="space-y-3 pt-4 border-t border-surface-100 dark:border-white/[0.06]">
                <h4 className="text-xs font-medium text-surface-500 uppercase tracking-wider">Outils executes</h4>
                {(output.toolResults as Record<string, unknown>[]).map((tr, i) => (
                  <div key={i} className="p-3 rounded-lg bg-surface-50 dark:bg-white/[0.03] border border-surface-100 dark:border-white/[0.06]">
                    <div className="text-xs font-mono font-medium text-brand-600 dark:text-brand-400 mb-1">{String(tr.tool)}</div>
                    <pre className="text-xs font-mono text-surface-500 overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(tr.result ?? tr.error, null, 2)}
                    </pre>
                  </div>
                ))}
              </div>
            )}
            {Boolean(output.error) && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-sm text-red-700 dark:text-red-300">
                {String(output.error)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {t.error && (
        <div className="card p-5 border-l-4 border-l-red-500">
          <h3 className="font-semibold text-sm text-red-700 dark:text-red-300 mb-1">Erreur</h3>
          <p className="text-sm text-red-600 dark:text-red-400 font-mono">{t.error}</p>
        </div>
      )}
    </div>
  );
}

function Metric({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs text-surface-400 mb-1">{icon}{label}</div>
      <div className="text-sm font-semibold text-surface-900 dark:text-surface-50">{value}</div>
      {sub && <div className="text-xs text-surface-400 mt-0.5">{sub}</div>}
    </div>
  );
}
