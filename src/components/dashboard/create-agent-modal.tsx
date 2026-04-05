"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { Loader2, Mail, Briefcase, FileText, Headphones, PieChart, Lock, Crown } from "lucide-react";
import { useRouter } from "next/navigation";

const agentTypes = [
  { value: "email", label: "Email", icon: Mail, desc: "Trie, repond et escalade vos emails automatiquement", color: "border-blue-200 bg-blue-50 dark:border-blue-500/20 dark:bg-blue-500/5" },
  { value: "commercial", label: "Commercial", icon: Briefcase, desc: "Qualifie vos leads, envoie devis et relances", color: "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/5" },
  { value: "admin", label: "Admin", icon: FileText, desc: "Classe documents, extrait donnees, archive", color: "border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-500/5" },
  { value: "support", label: "Support", icon: Headphones, desc: "Repond clients 24/7, tickets", color: "border-violet-200 bg-violet-50 dark:border-violet-500/20 dark:bg-violet-500/5" },
  { value: "direction", label: "Direction", icon: PieChart, desc: "Bilans, decisions, alertes", color: "border-rose-200 bg-rose-50 dark:border-rose-500/20 dark:bg-rose-500/5" },
] as const;

export function CreateAgentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<string>("email");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { success: toastSuccess } = useToast();

  // Fetch plan info to know allowed types
  const planInfo = trpc.agents.planInfo.useQuery(undefined, { enabled: open });

  const allowedTypes = planInfo.data?.allowedTypes ?? ["email"];
  const currentCount = planInfo.data?.currentCount ?? 0;
  const maxCount = planInfo.data?.maxCount ?? 1;
  const atLimit = currentCount >= maxCount;

  const createAgent = trpc.agents.create.useMutation({
    onSuccess: (agent) => {
      onClose();
      setName("");
      setType("email");
      setError(null);
      toastSuccess("Agent cree", "Completez la configuration pour l'activer.");
      // Redirect to setup wizard
      router.push(`/dashboard/agents/${agent.id}/setup`);
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setError(null);
    createAgent.mutate({
      type: type as "email" | "commercial" | "admin" | "support" | "direction",
      name: name.trim(),
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouvel agent IA"
      description={`${currentCount}/${maxCount} agents utilises`}
      footer={
        <>
          <button className="btn-secondary text-sm" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn-primary text-sm"
            onClick={handleSubmit}
            disabled={!name.trim() || createAgent.isPending || atLimit || !allowedTypes.includes(type)}
          >
            {createAgent.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Creer et configurer"
            )}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {atLimit && (
        <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <Crown className="w-4 h-4 shrink-0" />
          <span>
            Limite de {maxCount} agent{maxCount > 1 ? "s" : ""} atteinte.{" "}
            <a href="/dashboard/billing" className="font-medium underline">Passer au plan superieur</a>
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">
            Nom de l'agent
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mon agent email"
            className="input"
            maxLength={100}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-2">
            Type d'agent
          </label>
          <div className="grid grid-cols-1 gap-2">
            {agentTypes.map((at) => {
              const Icon = at.icon;
              const selected = type === at.value;
              const allowed = allowedTypes.includes(at.value);
              return (
                <button
                  key={at.value}
                  type="button"
                  onClick={() => allowed && setType(at.value)}
                  disabled={!allowed}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                    !allowed
                      ? "opacity-50 cursor-not-allowed border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-white/[0.02]"
                      : selected
                      ? `${at.color} ring-2 ring-brand-500/30`
                      : "border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/[0.03]"
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${allowed ? "text-surface-600 dark:text-surface-300" : "text-surface-400"}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium ${allowed ? "text-surface-900 dark:text-surface-50" : "text-surface-500"}`}>{at.label}</span>
                      {!allowed && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-surface-400">
                          <Lock className="w-3 h-3" />
                          Plan superieur
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-surface-400">{at.desc}</div>
                  </div>
                  {selected && allowed && (
                    <div className="w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </form>
    </Modal>
  );
}
