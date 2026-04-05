"use client";

import { useState } from "react";
import { Plus, Settings, Bot, Sparkles, Play } from "lucide-react";
import { CreateAgentModal } from "@/components/dashboard/create-agent-modal";
import { ConfigureAgentModal } from "@/components/dashboard/configure-agent-modal";
import { TestAgentModal } from "@/components/dashboard/test-agent-modal";
import { AgentToggleButton, AgentDeleteButton } from "@/components/dashboard/agent-actions";
import Link from "next/link";

export function AgentPageClient({ agentCount }: { agentCount: number }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Agents IA</h1>
          <p className="text-sm text-surface-500 mt-1">
            {agentCount} agent{agentCount > 1 ? "s" : ""} configure{agentCount > 1 ? "s" : ""}
          </p>
        </div>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4" />
          Nouvel agent
        </button>
      </div>
      <CreateAgentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function AgentEmptyState() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="card p-12 text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-brand-50 to-violet-50 dark:from-brand-500/10 dark:to-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Bot className="w-8 h-8 text-brand-500" />
        </div>
        <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">
          Aucun agent configure
        </h3>
        <p className="text-sm text-surface-500 max-w-sm mx-auto mb-6">
          Creez votre premier agent IA pour automatiser vos taches repetitives.
          Email, commercial, admin, support ou direction.
        </p>
        <button className="btn-primary" onClick={() => setModalOpen(true)}>
          <Sparkles className="w-4 h-4" />
          Creer mon premier agent
        </button>
      </div>
      <CreateAgentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function AgentCardActions({
  agentId,
  status,
  agent,
}: {
  agentId: string;
  status: string;
  agent?: { id: string; name: string; type: string; systemPrompt: string | null; config: unknown };
}) {
  const [configOpen, setConfigOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <AgentToggleButton agentId={agentId} currentStatus={status} />
        {agent && (
          <button className="btn-ghost text-sm px-3 py-2" onClick={() => setTestOpen(true)} title="Tester">
            <Play className="w-4 h-4" />
          </button>
        )}
        {agent ? (
          <button className="btn-ghost text-sm px-3 py-2" onClick={() => setConfigOpen(true)} title="Configurer">
            <Settings className="w-4 h-4" />
          </button>
        ) : (
          <Link href={`/dashboard/agents/${agentId}`} className="btn-ghost text-sm px-3 py-2">
            <Settings className="w-4 h-4" />
          </Link>
        )}
        <AgentDeleteButton agentId={agentId} />
      </div>

      {agent && (
        <>
          <ConfigureAgentModal
            open={configOpen}
            onClose={() => setConfigOpen(false)}
            agent={agent}
          />
          <TestAgentModal
            open={testOpen}
            onClose={() => setTestOpen(false)}
            agent={agent}
          />
        </>
      )}
    </>
  );
}
