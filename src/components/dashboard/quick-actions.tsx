"use client";

import { useState } from "react";
import { Plus, Upload, Bot, Users, FileText, Zap } from "lucide-react";
import { CreateAgentModal } from "@/components/dashboard/create-agent-modal";
import { CreateLeadModal } from "@/components/dashboard/create-lead-modal";
import Link from "next/link";

export function QuickActions() {
  const [agentModal, setAgentModal] = useState(false);
  const [leadModal, setLeadModal] = useState(false);

  return (
    <>
      <div className="card p-5">
        <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50 mb-3">Actions rapides</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setAgentModal(true)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/[0.03] transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Bot className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            </div>
            <span className="text-xs font-medium text-surface-700 dark:text-surface-300">Nouvel agent</span>
          </button>

          <button
            onClick={() => setLeadModal(true)}
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/[0.03] transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-surface-700 dark:text-surface-300">Nouveau lead</span>
          </button>

          <Link
            href="/dashboard/documents"
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/[0.03] transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-surface-700 dark:text-surface-300">Importer doc</span>
          </Link>

          <Link
            href="/dashboard/analytics"
            className="flex flex-col items-center gap-2 p-3 rounded-lg border border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/[0.03] transition-all text-center group"
          >
            <div className="w-9 h-9 rounded-lg bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-4 h-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-xs font-medium text-surface-700 dark:text-surface-300">Analytics</span>
          </Link>
        </div>
      </div>

      <CreateAgentModal open={agentModal} onClose={() => setAgentModal(false)} />
      <CreateLeadModal open={leadModal} onClose={() => setLeadModal(false)} />
    </>
  );
}
