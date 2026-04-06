import Link from "next/link";
import {
  Bot, Zap, CheckCircle2, TrendingUp, Activity, Users,
  Mail, Briefcase, FileText, Headphones, PieChart,
  ArrowRight, Sparkles, BarChart3, Clock
} from "lucide-react";

/**
 * Demo page — shows a preview of the dashboard without requiring authentication.
 * Static data only, no DB queries.
 */
export default function DemoPage() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-[#0f1117]">
      {/* Top bar */}
      <header className="h-16 border-b border-surface-200 dark:border-white/[0.06] bg-white dark:bg-[#12141f] flex items-center justify-between px-6 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-brand-700 rounded-lg flex items-center justify-center text-white font-bold text-sm">V</div>
          <h2 className="font-semibold text-surface-900 dark:text-surface-50">Demo PME SAS</h2>
          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Demo</span>
        </div>
        <Link href="/auth/signup" className="btn-primary text-sm">
          <Sparkles className="w-4 h-4" />
          Creer mon compte
        </Link>
      </header>

      <main className="p-6 max-w-[1400px] mx-auto space-y-6 animate-fade-in">
        {/* Welcome */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-brand-600 to-brand-700 p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-brand-200" />
              <span className="text-sm font-medium text-brand-200">Mode demo</span>
            </div>
            <h1 className="text-2xl font-bold mb-2">Bienvenue sur VotrIA 👋</h1>
            <p className="text-brand-100/70 text-sm max-w-lg">
              Voici un apercu de votre futur dashboard. Creez un compte pour demarrer avec vos propres agents IA.
            </p>
            <Link href="/auth/signup" className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition-colors">
              Demarrer l'essai gratuit <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          <KPI icon={<Zap className="w-5 h-5" />} label="Taches traitees" value="47" trend="+12%" color="brand" />
          <KPI icon={<CheckCircle2 className="w-5 h-5" />} label="Taux de reussite" value="96%" trend="Excellent" color="emerald" />
          <KPI icon={<Bot className="w-5 h-5" />} label="Agents actifs" value="3/5" color="violet" />
          <KPI icon={<TrendingUp className="w-5 h-5" />} label="Cout API (24h)" value="2.45 EUR" color="amber" />
        </div>

        {/* Agents + Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity feed */}
          <div className="lg:col-span-2 card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06] flex items-center gap-2">
              <Activity className="w-4 h-4 text-surface-400" />
              <h3 className="font-semibold text-surface-900 dark:text-surface-50">Activite recente</h3>
            </div>
            <div className="divide-y divide-surface-100 dark:divide-white/[0.04]">
              {[
                { type: "classify_email", status: "completed", time: "09:42", duration: "1.2s" },
                { type: "qualify_lead", status: "completed", time: "09:38", duration: "3.4s" },
                { type: "classify_document", status: "completed", time: "09:35", duration: "0.8s" },
                { type: "process_email", status: "escalated", time: "09:31", duration: "2.1s" },
                { type: "send_quote", status: "completed", time: "09:28", duration: "4.7s" },
                { type: "handle_support", status: "completed", time: "09:25", duration: "2.9s" },
              ].map((task, i) => (
                <div key={i} className="px-5 py-3 flex items-center justify-between hover:bg-surface-50 dark:hover:bg-white/[0.03] transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${task.status === "completed" ? "bg-emerald-500" : "bg-amber-500"}`} />
                    <div>
                      <div className="text-sm font-medium text-surface-800 dark:text-surface-200">{task.type}</div>
                      <div className="text-xs text-surface-400">{task.duration}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-[10px] ${task.status === "completed" ? "badge-success" : "badge-warning"}`}>
                      {task.status === "completed" ? "OK" : "Escalade"}
                    </span>
                    <span className="text-xs text-surface-400 tabular-nums">{task.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Agents */}
          <div className="card overflow-hidden">
            <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06] flex items-center gap-2">
              <Bot className="w-4 h-4 text-surface-400" />
              <h3 className="font-semibold text-surface-900 dark:text-surface-50">Agents</h3>
            </div>
            <div className="divide-y divide-surface-100 dark:divide-white/[0.04]">
              {[
                { name: "Agent Email", type: "email", icon: "✉️", status: "Actif" },
                { name: "Agent Commercial", type: "commercial", icon: "💼", status: "Actif" },
                { name: "Agent Admin", type: "admin", icon: "📄", status: "Actif" },
                { name: "Agent Support", type: "support", icon: "🎧", status: "Pause" },
                { name: "Agent Direction", type: "direction", icon: "📊", status: "Config" },
              ].map((agent) => (
                <div key={agent.name} className="px-5 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-surface-100 dark:bg-white/[0.06] flex items-center justify-center text-base">{agent.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-surface-800 dark:text-surface-200">{agent.name}</div>
                      <div className="text-xs text-surface-400 capitalize">{agent.type}</div>
                    </div>
                  </div>
                  <span className={agent.status === "Actif" ? "badge-success" : agent.status === "Pause" ? "badge-warning" : "badge-info"}>
                    {agent.status}
                  </span>
                </div>
              ))}
            </div>

            {/* Pipeline */}
            <div className="px-5 py-4 border-t border-surface-100 dark:border-white/[0.06] bg-surface-50/50 dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-surface-400" />
                <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">Pipeline</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 rounded-lg bg-white dark:bg-white/[0.03]">
                  <div className="text-xl font-bold text-surface-900 dark:text-surface-50">20</div>
                  <div className="text-xs text-surface-400">Total</div>
                </div>
                <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/5">
                  <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">8</div>
                  <div className="text-xs text-surface-400">Qualifies</div>
                </div>
                <div className="p-3 rounded-lg bg-brand-50/50 dark:bg-brand-500/5">
                  <div className="text-xl font-bold text-brand-600 dark:text-brand-400">5</div>
                  <div className="text-xs text-surface-400">Gagnes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="card p-8 text-center bg-gradient-to-br from-brand-50/50 to-violet-50/50 dark:from-brand-500/5 dark:to-violet-500/5">
          <Sparkles className="w-8 h-8 text-brand-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-2">Pret a automatiser votre entreprise ?</h2>
          <p className="text-sm text-surface-500 mb-4 max-w-md mx-auto">
            Creez votre compte gratuit et deployez votre premier agent IA en moins de 5 minutes.
          </p>
          <Link href="/auth/signup" className="btn-primary">
            Demarrer l'essai gratuit <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </main>
    </div>
  );
}

function KPI({ icon, label, value, trend, color }: { icon: React.ReactNode; label: string; value: string; trend?: string; color: string }) {
  const colors: Record<string, string> = {
    brand: "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400",
    emerald: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
    violet: "bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400",
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400",
  };
  return (
    <div className="stat-card group hover:shadow-elevation-2 transition-all hover:-translate-y-0.5">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>{icon}</div>
        {trend && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{trend}</span>}
      </div>
      <div className="stat-value mt-3">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}
