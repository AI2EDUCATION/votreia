"use client";

import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { RotateCcw, Loader2 } from "lucide-react";

export function TaskRetryButton({
  agentId,
  taskType,
  taskInput,
}: {
  agentId: string;
  taskType: string;
  taskInput: Record<string, unknown>;
}) {
  const { success, error: toastError } = useToast();
  const router = useRouter();

  const trigger = trpc.agents.trigger.useMutation({
    onSuccess: (result) => {
      success("Tache relancee", `Nouveau statut: ${result.status}`);
      router.refresh();
    },
    onError: (err) => toastError("Echec de la relance", err.message),
  });

  return (
    <button
      className="btn-primary text-sm"
      onClick={() => trigger.mutate({ agentId, taskType, taskInput })}
      disabled={trigger.isPending}
    >
      {trigger.isPending ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <><RotateCcw className="w-4 h-4" /> Relancer</>
      )}
    </button>
  );
}
