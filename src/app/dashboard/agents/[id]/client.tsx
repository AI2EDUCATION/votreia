"use client";

import { useState } from "react";
import { AgentToggleButton, AgentDeleteButton } from "@/components/dashboard/agent-actions";
import { ConfigureAgentModal } from "@/components/dashboard/configure-agent-modal";
import { TestAgentModal } from "@/components/dashboard/test-agent-modal";
import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Settings, Play, Loader2, Zap, Copy } from "lucide-react";

export function AgentDetailActions({ agentId, status }: { agentId: string; status: string }) {
  return (
    <div className="flex items-center gap-2">
      <AgentToggleButton agentId={agentId} currentStatus={status} />
      <CloneAgentButton agentId={agentId} />
      <AgentDeleteButton agentId={agentId} />
    </div>
  );
}

function CloneAgentButton({ agentId }: { agentId: string }) {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const clone = trpc.agents.clone.useMutation({
    onSuccess: (newAgent) => {
      success("Agent duplique", "Configurez la copie depuis la page setup.");
      router.push(`/dashboard/agents/${newAgent.id}/setup`);
    },
    onError: (err) => toastError("Impossible de dupliquer", err.message),
  });

  return (
    <button
      className="btn-ghost text-sm px-3 py-2"
      onClick={() => clone.mutate({ agentId })}
      disabled={clone.isPending}
      title="Dupliquer"
    >
      {clone.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
    </button>
  );
}

export function AgentConfigSection({
  agent,
}: {
  agent: {
    id: string;
    name: string;
    type: string;
    status: string;
    systemPrompt: string | null;
    config: unknown;
  };
}) {
  const [configOpen, setConfigOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);

  return (
    <>
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50">Configuration</h3>
          <div className="flex gap-2">
            <button className="btn-secondary text-sm" onClick={() => setTestOpen(true)}>
              <Play className="w-4 h-4" />
              Tester
            </button>
            <button className="btn-primary text-sm" onClick={() => setConfigOpen(true)}>
              <Settings className="w-4 h-4" />
              Configurer
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-surface-500 uppercase tracking-wider">Prompt systeme</label>
            <div className="mt-1 p-3 rounded-lg bg-surface-50 dark:bg-white/[0.03] border border-surface-100 dark:border-white/[0.06]">
              <p className="text-xs font-mono text-surface-600 dark:text-surface-400 whitespace-pre-wrap line-clamp-4">
                {agent.systemPrompt || "(Prompt par defaut)"}
              </p>
            </div>
          </div>

          {agent.status === "setup" && (
            <div>
              <a
                href={`/dashboard/agents/${agent.id}/setup`}
                className="text-sm text-brand-600 dark:text-brand-400 font-medium hover:underline flex items-center gap-1"
              >
                <Zap className="w-4 h-4" />
                Terminer la configuration →
              </a>
            </div>
          )}
        </div>
      </div>

      <ConfigureAgentModal open={configOpen} onClose={() => setConfigOpen(false)} agent={agent} />
      <TestAgentModal open={testOpen} onClose={() => setTestOpen(false)} agent={agent} />
    </>
  );
}

export function TriggerTaskButton({ agentId, agentType }: { agentId: string; agentType: string }) {
  const { success, error: toastError } = useToast();
  const router = useRouter();

  const trigger = trpc.agents.trigger.useMutation({
    onSuccess: (result) => {
      success("Tache executee", `Statut: ${result.status} — ${result.durationMs}ms`);
      router.refresh();
    },
    onError: (err) => toastError("Echec", err.message),
  });

  const defaultTasks: Record<string, { type: string; input: Record<string, unknown> }> = {
    email: { type: "classify_email", input: { from: "test@exemple.fr", subject: "Test", body: "Ceci est un test." } },
    commercial: { type: "qualify_lead", input: { email: "test@test.fr", company: "Test SAS", source: "manual" } },
    admin: { type: "classify_document", input: { fileName: "Test.pdf", mimeType: "application/pdf" } },
    support: { type: "handle_support", input: { customerEmail: "test@test.fr", subject: "Test", message: "Test support" } },
    direction: { type: "daily_brief", input: { stats: { total: 10, completed: 9, failed: 1 }, date: new Date().toISOString().split("T")[0] } },
  };

  const task = defaultTasks[agentType] ?? defaultTasks.email;

  return (
    <button
      className="btn-primary text-sm"
      onClick={() => trigger.mutate({ agentId, taskType: task.type, taskInput: task.input })}
      disabled={trigger.isPending}
    >
      {trigger.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Zap className="w-4 h-4" /> Executer une tache</>}
    </button>
  );
}
