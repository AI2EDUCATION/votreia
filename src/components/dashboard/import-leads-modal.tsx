"use client";

import { useState, useRef } from "react";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileText, CheckCircle2, AlertTriangle, Download } from "lucide-react";

interface ParsedLead {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  source?: string;
}

export function ImportLeadsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [leads, setLeads] = useState<ParsedLead[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const createLead = trpc.leads.create.useMutation();

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file, "utf-8");
  }

  function parseCSV(text: string) {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) {
      setErrors(["Le fichier doit contenir au moins un en-tete et une ligne de donnees."]);
      return;
    }

    const header = lines[0].toLowerCase().split(/[,;\t]/).map((h) => h.trim().replace(/"/g, ""));
    const colMap: Record<string, number> = {};

    // Map French + English column names
    const mappings: Record<string, string[]> = {
      firstName: ["prenom", "firstname", "first_name", "prenom"],
      lastName: ["nom", "lastname", "last_name", "nom_famille"],
      email: ["email", "mail", "e-mail", "courriel"],
      phone: ["telephone", "phone", "tel", "mobile"],
      company: ["entreprise", "company", "societe", "organisation"],
      source: ["source", "origine", "canal"],
    };

    for (const [field, aliases] of Object.entries(mappings)) {
      const idx = header.findIndex((h) => aliases.includes(h));
      if (idx !== -1) colMap[field] = idx;
    }

    if (!colMap.email && !colMap.firstName) {
      setErrors(["Colonnes non reconnues. Utilisez: prenom, nom, email, telephone, entreprise, source"]);
      return;
    }

    const parsed: ParsedLead[] = [];
    const errs: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ""));
      const lead: ParsedLead = {};

      if (colMap.firstName !== undefined) lead.firstName = cols[colMap.firstName] || undefined;
      if (colMap.lastName !== undefined) lead.lastName = cols[colMap.lastName] || undefined;
      if (colMap.email !== undefined) lead.email = cols[colMap.email] || undefined;
      if (colMap.phone !== undefined) lead.phone = cols[colMap.phone] || undefined;
      if (colMap.company !== undefined) lead.company = cols[colMap.company] || undefined;
      if (colMap.source !== undefined) lead.source = cols[colMap.source] || "import_csv";

      if (!lead.email && !lead.firstName) {
        errs.push(`Ligne ${i + 1}: ni email ni prenom detecte, ignoree.`);
        continue;
      }

      if (lead.email && !lead.email.includes("@")) {
        errs.push(`Ligne ${i + 1}: email invalide "${lead.email}", ignoree.`);
        continue;
      }

      parsed.push(lead);
    }

    setLeads(parsed);
    setErrors(errs);
  }

  async function handleImport() {
    setImporting(true);
    setImported(0);

    let count = 0;
    for (const lead of leads) {
      try {
        await createLead.mutateAsync({
          firstName: lead.firstName,
          lastName: lead.lastName,
          email: lead.email,
          phone: lead.phone,
          company: lead.company,
          source: lead.source ?? "import_csv",
        });
        count++;
        setImported(count);
      } catch {
        // Skip failed leads silently
      }
    }

    setImporting(false);
    success(`${count} lead${count > 1 ? "s" : ""} importe${count > 1 ? "s" : ""}`, `sur ${leads.length} total.`);
    onClose();
    setLeads([]);
    setErrors([]);
    router.refresh();
  }

  function downloadTemplate() {
    const csv = "prenom,nom,email,telephone,entreprise,source\nJean,Dupont,jean@exemple.fr,+33612345678,Entreprise SAS,linkedin\nMarie,Martin,marie@test.fr,+33698765432,Startup Inc,website";
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "template_leads_votria.csv";
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importer des leads"
      description="Importez vos prospects depuis un fichier CSV"
      footer={
        leads.length > 0 ? (
          <>
            <button className="btn-secondary text-sm" onClick={() => { setLeads([]); setErrors([]); }}>
              Reinitialiser
            </button>
            <button className="btn-primary text-sm" onClick={handleImport} disabled={importing}>
              {importing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> {imported}/{leads.length}</>
              ) : (
                `Importer ${leads.length} lead${leads.length > 1 ? "s" : ""}`
              )}
            </button>
          </>
        ) : (
          <button className="btn-secondary text-sm" onClick={onClose}>Fermer</button>
        )
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.tsv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />

      {leads.length === 0 ? (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            className="border-2 border-dashed border-surface-300 dark:border-white/10 rounded-lg p-8 text-center cursor-pointer hover:border-brand-400 dark:hover:border-brand-500/30 transition-colors"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
          >
            <Upload className="w-8 h-8 text-surface-300 mx-auto mb-3" />
            <p className="text-sm text-surface-600 dark:text-surface-300 mb-1">
              Deposez un fichier CSV ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-surface-400">
              Colonnes supportees : prenom, nom, email, telephone, entreprise, source
            </p>
          </div>

          {/* Template download */}
          <button className="btn-ghost text-xs w-full" onClick={downloadTemplate}>
            <Download className="w-3.5 h-3.5" />
            Telecharger le template CSV
          </button>

          {errors.length > 0 && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-sm text-red-700 dark:text-red-300 space-y-1">
              {errors.map((err, i) => <p key={i}>{err}</p>)}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Summary */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-500/5 border border-emerald-200 dark:border-emerald-500/20">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span className="text-sm text-emerald-700 dark:text-emerald-300">
              {leads.length} lead{leads.length > 1 ? "s" : ""} detecte{leads.length > 1 ? "s" : ""} dans le fichier
            </span>
          </div>

          {errors.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20">
              <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-700 dark:text-amber-300 space-y-0.5">
                {errors.slice(0, 5).map((err, i) => <p key={i}>{err}</p>)}
                {errors.length > 5 && <p>...et {errors.length - 5} autres avertissements</p>}
              </div>
            </div>
          )}

          {/* Preview */}
          <div className="max-h-48 overflow-y-auto rounded-lg border border-surface-200 dark:border-white/10">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-50 dark:bg-white/[0.02] sticky top-0">
                  <th className="text-left px-3 py-2 font-medium text-surface-500">Nom</th>
                  <th className="text-left px-3 py-2 font-medium text-surface-500">Email</th>
                  <th className="text-left px-3 py-2 font-medium text-surface-500">Entreprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100 dark:divide-white/[0.04]">
                {leads.slice(0, 10).map((lead, i) => (
                  <tr key={i}>
                    <td className="px-3 py-1.5 text-surface-800 dark:text-surface-200">
                      {[lead.firstName, lead.lastName].filter(Boolean).join(" ") || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-surface-500 font-mono">{lead.email ?? "—"}</td>
                    <td className="px-3 py-1.5 text-surface-500">{lead.company ?? "—"}</td>
                  </tr>
                ))}
                {leads.length > 10 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-1.5 text-center text-surface-400">
                      ...et {leads.length - 10} autres
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
