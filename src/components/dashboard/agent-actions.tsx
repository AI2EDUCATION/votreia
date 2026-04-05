"use client";

import { trpc } from "@/lib/trpc-client";
import { useRouter } from "next/navigation";
import { Play, Pause, Trash2, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

export function AgentToggleButton({ agentId, currentStatus }: { agentId: string; currentStatus: string }) {
  const router = useRouter();
  const isActive = currentStatus === "active";
  const { success, error: toastError } = useToast();

  const updateStatus = trpc.agents.updateStatus.useMutation({
    onSuccess: () => {
      success(isActive ? "Agent en pause" : "Agent active");
      router.refresh();
    },
    onError: (err) => toastError("Erreur", err.message),
  });

  return (
    <button
      className={`${isActive ? "btn-secondary" : "btn-primary"} text-sm flex-1 py-2`}
      onClick={() =>
        updateStatus.mutate({
          agentId,
          status: isActive ? "paused" : "active",
        })
      }
      disabled={updateStatus.isPending}
    >
      {updateStatus.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : isActive ? (
        <><Pause className="w-4 h-4" /> Pause</>
      ) : (
        <><Play className="w-4 h-4" /> Activer</>
      )}
    </button>
  );
}

export function AgentDeleteButton({ agentId }: { agentId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  const { success, error: toastError } = useToast();

  const deleteAgent = trpc.agents.delete.useMutation({
    onSuccess: () => {
      success("Agent supprime");
      router.refresh();
    },
    onError: (err) => {
      toastError("Impossible de supprimer", err.message);
      setConfirming(false);
    },
  });

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          className="btn-danger text-xs px-2 py-1"
          onClick={() => deleteAgent.mutate({ agentId })}
          disabled={deleteAgent.isPending}
        >
          {deleteAgent.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Confirmer"}
        </button>
        <button
          className="btn-ghost text-xs px-2 py-1"
          onClick={() => setConfirming(false)}
        >
          Non
        </button>
      </div>
    );
  }

  return (
    <button
      className="btn-ghost text-sm px-3 py-2 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
      onClick={() => setConfirming(true)}
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
