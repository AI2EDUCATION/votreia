"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc-client";
import { Loader2, User, Building2, Mail, Phone } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function CreateLeadModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    source: "manual",
  });
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { success: toastSuccess } = useToast();

  const createLead = trpc.leads.create.useMutation({
    onSuccess: () => {
      onClose();
      setForm({ firstName: "", lastName: "", email: "", phone: "", company: "", source: "manual" });
      setError(null);
      toastSuccess("Lead ajoute", "Le lead a ete ajoute a votre pipeline.");
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    createLead.mutate({
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      email: form.email || undefined,
      phone: form.phone || undefined,
      company: form.company || undefined,
      source: form.source,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Nouveau lead"
      description="Ajoutez un prospect a votre pipeline."
      footer={
        <>
          <button className="btn-secondary text-sm" onClick={onClose}>Annuler</button>
          <button
            className="btn-primary text-sm"
            onClick={handleSubmit}
            disabled={createLead.isPending}
          >
            {createLead.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Ajouter le lead"}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Prenom</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="text" value={form.firstName} onChange={(e) => update("firstName", e.target.value)} placeholder="Jean" className="input pl-10" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Nom</label>
            <input type="text" value={form.lastName} onChange={(e) => update("lastName", e.target.value)} placeholder="Dupont" className="input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Email</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jean@entreprise.fr" className="input pl-10" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Telephone</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="tel" value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="+33 6 12 34 56 78" className="input pl-10" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Entreprise</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="text" value={form.company} onChange={(e) => update("company", e.target.value)} placeholder="Entreprise SAS" className="input pl-10" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Source</label>
          <select value={form.source} onChange={(e) => update("source", e.target.value)} className="input">
            <option value="manual">Saisie manuelle</option>
            <option value="website">Site web</option>
            <option value="referral">Recommandation</option>
            <option value="linkedin">LinkedIn</option>
            <option value="email">Email entrant</option>
            <option value="event">Evenement</option>
          </select>
        </div>
      </form>
    </Modal>
  );
}
