"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";

const statuses = [
  { value: "new", label: "Nouveau" },
  { value: "contacted", label: "Contacte" },
  { value: "qualified", label: "Qualifie" },
  { value: "proposal", label: "Proposition" },
  { value: "won", label: "Gagne" },
  { value: "lost", label: "Perdu" },
];

export function LeadDetailActions({
  leadId,
  currentStatus,
  currentScore,
  currentNotes,
}: {
  leadId: string;
  currentStatus: string;
  currentScore: number;
  currentNotes: string;
}) {
  const [status, setStatus] = useState(currentStatus);
  const [score, setScore] = useState(currentScore);
  const [notes, setNotes] = useState(currentNotes);
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const updateLead = trpc.leads.update.useMutation({
    onSuccess: () => {
      success("Lead mis a jour");
      router.refresh();
    },
    onError: (err) => toastError("Erreur", err.message),
  });

  function handleSave() {
    updateLead.mutate({
      leadId,
      status: status as any,
      score,
      notes: notes || undefined,
    });
  }

  return (
    <div className="card p-5 space-y-4">
      <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50">Actions</h3>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Statut</label>
          <select className="input" value={status} onChange={(e) => setStatus(e.target.value)}>
            {statuses.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Score (0-100)</label>
          <input type="number" className="input" min={0} max={100} value={score} onChange={(e) => setScore(parseInt(e.target.value) || 0)} />
        </div>
        <div className="flex items-end">
          <button className="btn-primary text-sm w-full" onClick={handleSave} disabled={updateLead.isPending}>
            {updateLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Enregistrer</>}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Notes</label>
        <textarea className="input min-h-[80px] resize-y" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ajouter des notes sur ce lead..." />
      </div>
    </div>
  );
}
