"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { Loader2, Save, RotateCcw, Sparkles, Wrench, FileText, Zap } from "lucide-react";

const DEFAULT_PROMPTS: Record<string, string> = {
  email: `Tu es un assistant email professionnel pour une PME francaise. Tu traites les emails entrants :
- Classifie chaque email par categorie et urgence
- Redige des reponses professionnelles en francais
- Escalade les emails sensibles ou complexes vers un humain
- Ne reponds JAMAIS aux emails suspects ou spam
- Ton : professionnel mais chaleureux, vouvoiement par defaut
- Signe toujours avec le nom de l'entreprise`,
  commercial: `Tu es un assistant commercial IA pour une PME francaise. Tu geres le pipeline commercial :
- Qualifie les leads entrants (scoring 0-100)
- Redige des emails de prospection personnalises
- Planifie les relances au bon moment
- Genere des propositions commerciales
- Ton : professionnel, oriente solution, persuasif mais honnete
- Respecte scrupuleusement la reglementation RGPD`,
  admin: `Tu es un assistant administratif IA pour une PME francaise. Tu traites les documents :
- Classifie automatiquement les documents (factures, contrats, devis, etc.)
- Extrais les donnees cles (montants, dates, fournisseurs, numeros)
- Organise et archive les fichiers
- Signale les anomalies (montants inhabituels, echeances proches)
- Sois meticuleux et precis dans l'extraction de donnees`,
  support: `Tu es un agent de support client IA pour une PME francaise. Tu assistes les clients :
- Reponds aux questions frequentes avec empathie
- Cree des tickets pour les problemes complexes
- Escalade les clients mecontents vers un humain
- Ton : empathique, patient, oriente solution
- Vouvoiement systematique`,
  direction: `Tu es un assistant de direction IA pour un dirigeant de PME francaise. Tu fournis :
- Des bilans quotidiens synthetiques de l'activite
- Le suivi des decisions et actions en cours
- Des alertes sur les indicateurs importants
- Des recommandations strategiques basees sur les donnees
- Ton : concis, factuel, oriente action, pas de fluff`,
};

const TOOLS_PER_TYPE: Record<string, Array<{ name: string; desc: string }>> = {
  email: [
    { name: "send_email", desc: "Envoyer des emails de reponse" },
    { name: "classify_email", desc: "Classifier par categorie et urgence" },
    { name: "escalate_to_human", desc: "Escalader vers un humain" },
  ],
  commercial: [
    { name: "qualify_lead", desc: "Scorer et qualifier les prospects" },
    { name: "send_quote", desc: "Generer et envoyer des devis" },
    { name: "schedule_followup", desc: "Planifier des relances" },
  ],
  admin: [
    { name: "classify_document", desc: "Classifier les documents" },
    { name: "extract_data", desc: "Extraire des donnees structurees" },
  ],
  support: [
    { name: "reply_to_customer", desc: "Repondre aux clients" },
    { name: "create_ticket", desc: "Creer des tickets support" },
  ],
  direction: [
    { name: "send_daily_brief", desc: "Envoyer le bilan quotidien" },
    { name: "track_decisions", desc: "Suivre les decisions" },
  ],
};

interface Props {
  open: boolean;
  onClose: () => void;
  agent: {
    id: string;
    name: string;
    type: string;
    systemPrompt: string | null;
    config: unknown;
  };
}

export function ConfigureAgentModal({ open, onClose, agent }: Props) {
  const [tab, setTab] = useState<"prompt" | "tools" | "advanced">("prompt");
  const [name, setName] = useState(agent.name);
  const [prompt, setPrompt] = useState(agent.systemPrompt ?? DEFAULT_PROMPTS[agent.type] ?? "");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { success: toastSuccess } = useToast();

  const updateConfig = trpc.agents.updateConfig.useMutation({
    onSuccess: () => {
      toastSuccess("Configuration sauvegardee");
      onClose();
      router.refresh();
    },
    onError: (err) => setError(err.message),
  });

  function handleSave() {
    setError(null);
    updateConfig.mutate({
      agentId: agent.id,
      name: name !== agent.name ? name : undefined,
      systemPrompt: prompt || null,
      config: agent.config as Record<string, unknown> ?? {},
    });
  }

  function resetPrompt() {
    setPrompt(DEFAULT_PROMPTS[agent.type] ?? "");
  }

  const tools = TOOLS_PER_TYPE[agent.type] ?? [];

  const tabs = [
    { id: "prompt" as const, label: "Prompt systeme", icon: FileText },
    { id: "tools" as const, label: "Outils", icon: Wrench },
    { id: "advanced" as const, label: "Avance", icon: Zap },
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Configurer — ${agent.name}`}
      description={`Agent ${agent.type}`}
      footer={
        <>
          <button className="btn-secondary text-sm" onClick={onClose}>Annuler</button>
          <button className="btn-primary text-sm" onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4" /> Sauvegarder</>}
          </button>
        </>
      }
    >
      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 bg-surface-100 dark:bg-white/5 rounded-lg">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                tab === t.id
                  ? "bg-white dark:bg-[#1a1d2e] text-surface-900 dark:text-surface-50 shadow-sm"
                  : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab: System Prompt */}
      {tab === "prompt" && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Nom de l'agent</label>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Prompt systeme</label>
              <button onClick={resetPrompt} className="text-xs text-surface-400 hover:text-surface-600 flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                Reinitialiser
              </button>
            </div>
            <textarea
              className="input min-h-[200px] font-mono text-xs resize-y"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={10000}
              placeholder="Instructions pour l'agent..."
            />
            <div className="flex items-center justify-between mt-1.5">
              <p className="text-xs text-surface-400">
                Ce prompt definit le comportement de l'agent. Soyez precis sur le ton, les regles et les limites.
              </p>
              <span className={`text-xs tabular-nums ${prompt.length > 9000 ? "text-red-500" : "text-surface-400"}`}>
                {prompt.length.toLocaleString()}/10 000
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Tools */}
      {tab === "tools" && (
        <div className="space-y-3">
          <p className="text-xs text-surface-500 mb-2">
            Outils disponibles pour l'agent <strong>{agent.type}</strong>. Ces outils sont appeles automatiquement par l'IA quand necessaire.
          </p>
          {tools.length === 0 ? (
            <div className="text-center py-6 text-sm text-surface-400">Aucun outil pour ce type d'agent.</div>
          ) : (
            tools.map((tool) => (
              <div key={tool.name} className="flex items-center justify-between p-3 rounded-lg border border-surface-200 dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center">
                    <Wrench className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                  </div>
                  <div>
                    <div className="text-sm font-medium font-mono text-surface-800 dark:text-surface-200">{tool.name}</div>
                    <div className="text-xs text-surface-400">{tool.desc}</div>
                  </div>
                </div>
                <span className="badge-success text-[10px]">Actif</span>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Advanced */}
      {tab === "advanced" && (
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-sm text-amber-700 dark:text-amber-300">
            <Sparkles className="w-4 h-4 inline mr-1" />
            Les parametres avances sont reserves aux utilisateurs experimentes.
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Modele IA prefere</label>
            <select className="input">
              <option value="auto">Automatique (recommande)</option>
              <option value="fast">Rapide (Haiku — classification)</option>
              <option value="standard">Standard (Sonnet — general)</option>
              <option value="extended">Etendu (Sonnet — analyse longue)</option>
            </select>
            <p className="text-xs text-surface-400 mt-1">Le mode automatique choisit le meilleur modele selon le type de tache.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Temperature (creativite)</label>
            <input type="range" min="0" max="100" defaultValue="30" className="w-full" />
            <div className="flex justify-between text-xs text-surface-400 mt-1">
              <span>Precis (0.0)</span>
              <span>Creatif (1.0)</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Tokens max par reponse</label>
            <input type="number" className="input" defaultValue={4096} min={256} max={16384} />
          </div>
        </div>
      )}
    </Modal>
  );
}
