"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc-client";
import { Loader2, Play, Sparkles, CheckCircle2, Wrench } from "lucide-react";

const TEST_EXAMPLES: Record<string, Array<{ type: string; label: string; input: Record<string, unknown> }>> = {
  email: [
    {
      type: "classify_email",
      label: "Classifier un email",
      input: { from: "client@exemple.fr", subject: "Demande de devis urgente", body: "Bonjour, je souhaiterais obtenir un devis pour votre service premium. C'est assez urgent car nous devons prendre une decision cette semaine. Merci" },
    },
    {
      type: "process_email",
      label: "Traiter un email complet",
      input: { from: "fournisseur@acme.fr", subject: "Facture N°2024-042", body: "Veuillez trouver ci-joint la facture pour la prestation du mois de mars. Montant: 2 450 EUR HT. Echeance: 30 jours." },
    },
  ],
  commercial: [
    {
      type: "qualify_lead",
      label: "Qualifier un prospect",
      input: { email: "marie.dupont@techcorp.fr", company: "TechCorp SAS", source: "website", leadId: "test-lead-001" },
    },
    {
      type: "followup_lead",
      label: "Preparer une relance",
      input: { leadId: "test-lead-001", email: "contact@prospect.fr", lastContact: "il y a 5 jours" },
    },
  ],
  admin: [
    {
      type: "classify_document",
      label: "Classifier un document",
      input: { fileName: "Facture_2024_0042.pdf", mimeType: "application/pdf", documentId: "test-doc-001" },
    },
    {
      type: "extract_data",
      label: "Extraire des donnees",
      input: { fileName: "Contrat_Maintenance.pdf", documentId: "test-doc-002", content: "Contrat de maintenance annuel. Montant: 12 000 EUR HT. Duree: 12 mois. Debut: 01/04/2024." },
    },
  ],
  support: [
    {
      type: "handle_support",
      label: "Traiter un ticket",
      input: { customerEmail: "client@exemple.fr", subject: "Probleme de connexion", message: "Bonjour, je n'arrive plus a me connecter a mon compte depuis ce matin. J'ai essaye de reinitialiser mon mot de passe mais ca ne fonctionne pas." },
    },
  ],
  direction: [
    {
      type: "daily_brief",
      label: "Generer un bilan",
      input: { stats: { total: 45, completed: 42, failed: 2, avgDuration: 3200, totalCost: 450 }, date: new Date().toISOString().split("T")[0] },
    },
  ],
};

interface Props {
  open: boolean;
  onClose: () => void;
  agent: { id: string; name: string; type: string };
}

export function TestAgentModal({ open, onClose, agent }: Props) {
  const examples = TEST_EXAMPLES[agent.type] ?? [];
  const [selected, setSelected] = useState(0);
  const [customInput, setCustomInput] = useState("");
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const testRun = trpc.agents.testRun.useMutation({
    onSuccess: (data) => setResult(data as Record<string, unknown>),
    onError: (err) => setResult({ error: err.message }),
  });

  function handleRun() {
    setResult(null);
    const example = examples[selected];
    if (!example) return;

    let testInput = example.input;
    if (customInput.trim()) {
      try {
        testInput = JSON.parse(customInput);
      } catch {
        setResult({ error: "JSON invalide dans le champ personnalise." });
        return;
      }
    }

    testRun.mutate({
      agentId: agent.id,
      taskType: example.type,
      testInput,
    });
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Tester — ${agent.name}`}
      description="Mode simulation (0 EUR, aucun appel API)"
    >
      <div className="space-y-4">
        {/* Badge */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-brand-50 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/10">
          <Sparkles className="w-4 h-4 text-brand-500 shrink-0" />
          <span className="text-xs text-brand-700 dark:text-brand-300">
            Les tests utilisent le mode simulation. Aucun cout API ne sera engendre.
          </span>
        </div>

        {/* Example selector */}
        <div>
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Scenario de test</label>
          <div className="space-y-1.5">
            {examples.map((ex, i) => (
              <button
                key={ex.type}
                onClick={() => { setSelected(i); setCustomInput(""); setResult(null); }}
                className={`w-full text-left p-3 rounded-lg border transition-all ${
                  selected === i
                    ? "border-brand-500/30 bg-brand-50/50 dark:bg-brand-500/5 ring-1 ring-brand-500/20"
                    : "border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/[0.03]"
                }`}
              >
                <div className="text-sm font-medium text-surface-800 dark:text-surface-200">{ex.label}</div>
                <div className="text-xs text-surface-400 font-mono mt-0.5">{ex.type}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Input preview */}
        {examples[selected] && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Donnees d'entree</label>
              <span className="text-xs text-surface-400">Modifiable</span>
            </div>
            <textarea
              className="input font-mono text-xs min-h-[100px] resize-y"
              value={customInput || JSON.stringify(examples[selected].input, null, 2)}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="JSON..."
            />
          </div>
        )}

        {/* Run button */}
        <button
          className="btn-primary w-full"
          onClick={handleRun}
          disabled={testRun.isPending || examples.length === 0}
        >
          {testRun.isPending ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Execution en cours...</>
          ) : (
            <><Play className="w-4 h-4" /> Lancer le test</>
          )}
        </button>

        {/* Result */}
        {result && (
          <div className="rounded-lg border border-surface-200 dark:border-white/10 overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-50 dark:bg-white/[0.02] border-b border-surface-100 dark:border-white/[0.06] flex items-center gap-2">
              {result.error ? (
                <span className="text-xs font-medium text-red-600 dark:text-red-400">Erreur</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-700 dark:text-emerald-300">Resultat (simulation)</span>
                </>
              )}
            </div>
            <div className="p-4">
              {result.error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{String(result.error)}</p>
              ) : (
                <>
                  {result.text && (
                    <div className="text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap leading-relaxed mb-3">
                      {String(result.text)}
                    </div>
                  )}
                  {result.toolResults && Array.isArray(result.toolResults) && result.toolResults.length > 0 && (
                    <div className="space-y-2 pt-3 border-t border-surface-100 dark:border-white/[0.06]">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-surface-500">
                        <Wrench className="w-3 h-3" />
                        Outils appeles
                      </div>
                      {(result.toolResults as Record<string, unknown>[]).map((tr, i) => (
                        <div key={i} className="p-2.5 rounded bg-surface-50 dark:bg-white/[0.03] border border-surface-100 dark:border-white/[0.06]">
                          <div className="text-xs font-mono font-medium text-brand-600 dark:text-brand-400">{String(tr.tool)}</div>
                          <pre className="text-[11px] font-mono text-surface-500 mt-1 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(tr.result, null, 2)}
                          </pre>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
