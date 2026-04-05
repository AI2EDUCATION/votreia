"use client";

import { CheckCircle2, Circle, ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export function OnboardingChecklist({
  hasAgents,
  hasActiveAgent,
  hasLeads,
  hasDocuments,
  hasIntegration,
}: {
  hasAgents: boolean;
  hasActiveAgent: boolean;
  hasLeads: boolean;
  hasDocuments: boolean;
  hasIntegration: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem("votria-onboarding-dismissed") === "true");
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    localStorage.setItem("votria-onboarding-dismissed", "true");
  }

  const steps: OnboardingStep[] = [
    { id: "agent", label: "Creer votre premier agent", description: "Choisissez un type et configurez-le", href: "/dashboard/agents", done: hasAgents },
    { id: "activate", label: "Activer un agent", description: "Completez la configuration et activez", href: "/dashboard/agents", done: hasActiveAgent },
    { id: "lead", label: "Ajouter un lead", description: "Manuellement ou importez un fichier CSV", href: "/dashboard/leads", done: hasLeads },
    { id: "document", label: "Importer un document", description: "L'agent Admin le classera automatiquement", href: "/dashboard/documents", done: hasDocuments },
    { id: "integration", label: "Connecter Gmail ou Outlook", description: "Activez le traitement automatique des emails", href: "/dashboard/settings", done: hasIntegration },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const allDone = completedCount === steps.length;

  if (dismissed || allDone) return null;

  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-100 dark:border-white/[0.06] flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50">Demarrage rapide</h3>
          <p className="text-xs text-surface-400 mt-0.5">{completedCount}/{steps.length} etapes completees</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress bar */}
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-surface-100 dark:bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-xs text-surface-400 tabular-nums">{progress}%</span>
          </div>
          <button onClick={dismiss} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-white/5 text-surface-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="divide-y divide-surface-100 dark:divide-white/[0.04]">
        {steps.map((step) => (
          <Link
            key={step.id}
            href={step.href}
            className={`px-5 py-3 flex items-center gap-3 transition-colors ${
              step.done
                ? "opacity-60"
                : "hover:bg-surface-50 dark:hover:bg-white/[0.02]"
            }`}
          >
            {step.done ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
            ) : (
              <Circle className="w-5 h-5 text-surface-300 dark:text-surface-600 shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className={`text-sm font-medium ${step.done ? "line-through text-surface-400" : "text-surface-800 dark:text-surface-200"}`}>
                {step.label}
              </div>
              <div className="text-xs text-surface-400">{step.description}</div>
            </div>
            {!step.done && <ArrowRight className="w-4 h-4 text-surface-300 shrink-0" />}
          </Link>
        ))}
      </div>
    </div>
  );
}
