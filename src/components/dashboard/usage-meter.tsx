"use client";

import { AlertTriangle, TrendingUp, Zap, Cpu, CreditCard, ArrowUpRight } from "lucide-react";
import Link from "next/link";

interface UsageData {
  plan: string;
  usage: {
    tasksToday: number;
    tasksMonth: number;
    tokensMonth: number;
    costCentsMonth: number;
    activeAgents: number;
  };
  limits: {
    maxAgents: number;
    maxTasksPerDay: number;
    maxTasksPerMonth: number;
    maxTokensPerMonth: number;
    maxCostCentsPerMonth: number;
  };
  utilization: {
    percent: number;
    level: "ok" | "warning" | "critical" | "exceeded";
    tasksDay: number;
    tasksMonth: number;
    tokensMonth: number;
    costMonth: number;
  };
  allowed: boolean;
}

export function UsageMeter({ data }: { data: UsageData }) {
  const { usage, limits, utilization } = data;

  const meters = [
    {
      label: "Taches aujourd'hui",
      current: usage.tasksToday,
      max: limits.maxTasksPerDay,
      percent: utilization.tasksDay,
      icon: <Zap className="w-4 h-4" />,
      format: (v: number) => v.toLocaleString("fr-FR"),
    },
    {
      label: "Taches ce mois",
      current: usage.tasksMonth,
      max: limits.maxTasksPerMonth,
      percent: utilization.tasksMonth,
      icon: <TrendingUp className="w-4 h-4" />,
      format: (v: number) => v.toLocaleString("fr-FR"),
    },
    {
      label: "Tokens ce mois",
      current: usage.tokensMonth,
      max: limits.maxTokensPerMonth,
      percent: utilization.tokensMonth,
      icon: <Cpu className="w-4 h-4" />,
      format: (v: number) =>
        v >= 1_000_000
          ? `${(v / 1_000_000).toFixed(1)}M`
          : v >= 1_000
          ? `${(v / 1_000).toFixed(0)}K`
          : v.toString(),
    },
    {
      label: "Budget API",
      current: usage.costCentsMonth,
      max: limits.maxCostCentsPerMonth,
      percent: utilization.costMonth,
      icon: <CreditCard className="w-4 h-4" />,
      format: (v: number) => `${(v / 100).toFixed(2)}€`,
    },
  ];

  const visibleMeters = meters.filter((m) => m.max > 0);
  const isTrial = data.plan === "trial";

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-surface-400" />
          <h3 className="font-semibold text-surface-900 dark:text-surface-50">Consommation</h3>
          <PlanBadge plan={data.plan} />
        </div>
        {!data.allowed && (
          <Link
            href="/dashboard/billing"
            className="text-xs font-medium text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1"
          >
            Passer au plan superieur
            <ArrowUpRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {/* Trial simulation banner */}
      {isTrial && (
        <div className="px-5 py-3 bg-brand-50 dark:bg-brand-500/5 border-b border-brand-100 dark:border-brand-500/10 flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
          <Zap className="w-4 h-4 shrink-0" />
          <span>
            <strong>Mode Simulation</strong> — Les agents fonctionnent avec des reponses demo.
          </span>
          <Link href="/dashboard/billing" className="ml-auto font-semibold hover:underline shrink-0">
            Activer l'IA →
          </Link>
        </div>
      )}

      {/* Global warning banner */}
      {!isTrial && utilization.level === "exceeded" && (
        <div className="px-5 py-3 bg-red-50 dark:bg-red-500/5 border-b border-red-100 dark:border-red-500/10 flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium">
            Limite atteinte — les agents sont suspendus.
          </span>
          <Link href="/dashboard/billing" className="ml-auto font-semibold hover:underline">
            Upgrade →
          </Link>
        </div>
      )}
      {!isTrial && utilization.level === "critical" && (
        <div className="px-5 py-3 bg-amber-50 dark:bg-amber-500/5 border-b border-amber-100 dark:border-amber-500/10 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            Consommation a <strong>{utilization.percent}%</strong> — les limites
            seront bientot atteintes.
          </span>
        </div>
      )}

      <div className="p-5 space-y-4">
        {visibleMeters.map((meter) => (
          <MeterBar key={meter.label} {...meter} />
        ))}

        {/* Agents counter */}
        <div className="flex items-center justify-between pt-3 border-t border-surface-100 dark:border-white/[0.06]">
          <span className="text-sm text-surface-500">Agents actifs</span>
          <span className="text-sm font-semibold text-surface-900 dark:text-surface-50">
            {usage.activeAgents} / {limits.maxAgents}
          </span>
        </div>
      </div>
    </div>
  );
}

function MeterBar({
  label,
  current,
  max,
  percent,
  icon,
  format,
}: {
  label: string;
  current: number;
  max: number;
  percent: number;
  icon: React.ReactNode;
  format: (v: number) => string;
}) {
  const clampedPercent = Math.min(percent, 100);
  const color =
    percent >= 100
      ? "bg-red-500"
      : percent >= 90
      ? "bg-amber-500"
      : percent >= 75
      ? "bg-amber-400"
      : "bg-brand-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 text-sm text-surface-600 dark:text-surface-400">
          {icon}
          {label}
        </div>
        <div className="text-xs text-surface-400">
          <span className="font-medium text-surface-700 dark:text-surface-300">{format(current)}</span>
          {" / "}
          {format(max)}
        </div>
      </div>
      <div className="w-full h-2 bg-surface-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const styles: Record<string, string> = {
    trial: "bg-surface-100 text-surface-500 dark:bg-white/5 dark:text-surface-400",
    essentiel: "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300",
    professionnel: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
    commande_totale: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  };
  const labels: Record<string, string> = {
    trial: "Essai",
    essentiel: "Essentiel",
    professionnel: "Pro",
    commande_totale: "Commande Totale",
  };

  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[plan] ?? styles.trial}`}
    >
      {labels[plan] ?? plan}
    </span>
  );
}

export function UsageBarCompact({
  percent,
  level,
}: {
  percent: number;
  level: "ok" | "warning" | "critical" | "exceeded";
}) {
  const color =
    level === "exceeded"
      ? "bg-red-500"
      : level === "critical"
      ? "bg-amber-500"
      : level === "warning"
      ? "bg-amber-400"
      : "bg-brand-500";

  return (
    <div className="flex items-center gap-2" title={`Consommation: ${percent}%`}>
      <div className="w-20 h-1.5 bg-surface-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
      <span className="text-xs text-surface-400">{percent}%</span>
    </div>
  );
}
