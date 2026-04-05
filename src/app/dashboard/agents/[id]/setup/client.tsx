"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, Check, Loader2, Sparkles, FileText,
  Play, Wrench, RotateCcw, CheckCircle2, Bot
} from "lucide-react";
import Link from "next/link";

const DEFAULT_PROMPTS: Record<string, string> = {
  email: `Tu es un assistant email professionnel pour une PME francaise.\n- Classifie chaque email par categorie et urgence\n- Redige des reponses professionnelles en francais\n- Escalade les emails sensibles vers un humain\n- Ton : professionnel, vouvoiement`,
  commercial: `Tu es un assistant commercial IA pour une PME francaise.\n- Qualifie les leads (scoring 0-100)\n- Redige des emails de prospection personnalises\n- Planifie les relances\n- Ton : professionnel, persuasif, RGPD`,
  admin: `Tu es un assistant administratif IA.\n- Classifie les documents (factures, contrats, devis)\n- Extrais les donnees cles\n- Signale les anomalies\n- Sois meticuleux et precis`,
  support: `Tu es un agent de support client IA.\n- Reponds avec empathie\n- Cree des tickets pour les problemes complexes\n- Escalade les clients mecontents\n- Vouvoiement systematique`,
  direction: `Tu es un assistant de direction IA.\n- Bilans quotidiens synthetiques\n- Suivi des decisions et actions\n- Alertes sur les indicateurs importants\n- Ton : concis, factuel, oriente action`,
};

const AGENT_DESCRIPTIONS: Record<string, string> = {
  email: "Cet agent traite automatiquement vos emails entrants : classification, reponses, escalades.",
  commercial: "Cet agent qualifie vos prospects, envoie des devis et planifie les relances.",
  admin: "Cet agent classe vos documents, extrait les donnees et organise vos fichiers.",
  support: "Cet agent repond a vos clients 24/7 et cree des tickets pour les cas complexes.",
  direction: "Cet agent genere des bilans quotidiens et suit les decisions de votre entreprise.",
};

const AGENT_ICONS: Record<string, string> = {
  email: "✉️", commercial: "💼", admin: "📄", support: "🎧", direction: "📊",
};

interface Props {
  agent: {
    id: string;
    name: string;
    type: string;
    systemPrompt: string | null;
    config: unknown;
    status: string;
  };
}

export function SetupWizardClient({ agent }: Props) {
  const [step, setStep] = useState(0);
  const [prompt, setPrompt] = useState(agent.systemPrompt ?? DEFAULT_PROMPTS[agent.type] ?? "");
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null);
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();

  const updateConfig = trpc.agents.updateConfig.useMutation();
  const updateStatus = trpc.agents.updateStatus.useMutation();
  const testRun = trpc.agents.testRun.useMutation({
    onSuccess: (data) => setTestResult(data as Record<string, unknown>),
    onError: (err) => toastError("Erreur de test", err.message),
  });

  const steps = [
    { label: "Presentation", icon: Bot },
    { label: "Personnalisation", icon: FileText },
    { label: "Test", icon: Play },
    { label: "Activation", icon: Sparkles },
  ];

  async function handleSavePrompt() {
    await updateConfig.mutateAsync({
      agentId: agent.id,
      systemPrompt: prompt || null,
    });
    setStep(2);
  }

  function handleTest() {
    setTestResult(null);
    const testInputs: Record<string, { type: string; input: Record<string, unknown> }> = {
      email: { type: "classify_email", input: { from: "client@test.fr", subject: "Demande urgente", body: "Besoin d'un devis rapidement" } },
      commercial: { type: "qualify_lead", input: { email: "prospect@test.fr", company: "Test SAS", source: "website" } },
      admin: { type: "classify_document", input: { fileName: "Facture_test.pdf", mimeType: "application/pdf" } },
      support: { type: "handle_support", input: { customerEmail: "client@test.fr", subject: "Aide", message: "Je n'arrive pas a me connecter" } },
      direction: { type: "daily_brief", input: { stats: { total: 30, completed: 28, failed: 1 }, date: new Date().toISOString().split("T")[0] } },
    };

    const test = testInputs[agent.type] ?? testInputs.email;
    testRun.mutate({ agentId: agent.id, taskType: test.type, testInput: test.input });
  }

  async function handleActivate() {
    try {
      await updateStatus.mutateAsync({ agentId: agent.id, status: "active" });
      toastSuccess("Agent active !", `${agent.name} est maintenant operationnel.`);
      router.push(`/dashboard/agents/${agent.id}`);
    } catch (err) {
      toastError("Erreur", "Impossible d'activer l'agent.");
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/dashboard/agents" className="flex items-center gap-1 text-surface-500 hover:text-surface-700 dark:hover:text-surface-300">
          <ArrowLeft className="w-4 h-4" />
          Agents
        </Link>
        <span className="text-surface-300 dark:text-surface-600">/</span>
        <span className="text-surface-900 dark:text-surface-50 font-medium">Configuration de {agent.name}</span>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const done = i < step;
          const active = i === step;
          return (
            <div key={s.label} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-all ${
                done ? "bg-emerald-500 text-white" :
                active ? "bg-brand-600 text-white shadow-glow-brand" :
                "bg-surface-100 dark:bg-white/5 text-surface-400"
              }`}>
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-0.5 rounded ${done ? "bg-emerald-500" : "bg-surface-200 dark:bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step content */}
      <div className="card p-6 animate-fade-in">
        {/* Step 0: Presentation */}
        {step === 0 && (
          <div className="text-center space-y-4">
            <div className="text-5xl mb-2">{AGENT_ICONS[agent.type] ?? "🤖"}</div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">{agent.name}</h2>
            <p className="text-sm text-surface-500 max-w-md mx-auto">
              {AGENT_DESCRIPTIONS[agent.type] ?? "Agent IA autonome."}
            </p>

            <div className="pt-4 border-t border-surface-100 dark:border-white/[0.06]">
              <h3 className="text-sm font-semibold text-surface-700 dark:text-surface-300 mb-3">Ce que cet agent peut faire :</h3>
              <div className="grid grid-cols-1 gap-2 text-left max-w-sm mx-auto">
                {getCapabilities(agent.type).map((cap) => (
                  <div key={cap} className="flex items-center gap-2 text-sm text-surface-600 dark:text-surface-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    {cap}
                  </div>
                ))}
              </div>
            </div>

            <button className="btn-primary mt-4" onClick={() => setStep(1)}>
              Configurer <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Step 1: System Prompt */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50 mb-1">Personnalisez le comportement</h2>
              <p className="text-sm text-surface-500">Le prompt systeme definit comment l'agent pense et agit. Modifiez-le ou gardez le defaut.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Prompt systeme</label>
                <button onClick={() => setPrompt(DEFAULT_PROMPTS[agent.type] ?? "")} className="text-xs text-surface-400 hover:text-surface-600 flex items-center gap-1">
                  <RotateCcw className="w-3 h-3" /> Reinitialiser
                </button>
              </div>
              <textarea
                className="input font-mono text-xs min-h-[180px] resize-y"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                maxLength={10000}
              />
              <span className={`text-xs tabular-nums ${prompt.length > 9000 ? "text-red-500" : "text-surface-400"}`}>
                {prompt.length.toLocaleString()}/10 000
              </span>
            </div>

            <div className="flex justify-between pt-2">
              <button className="btn-secondary text-sm" onClick={() => setStep(0)}>
                <ArrowLeft className="w-4 h-4" /> Retour
              </button>
              <button
                className="btn-primary text-sm"
                onClick={handleSavePrompt}
                disabled={updateConfig.isPending}
              >
                {updateConfig.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sauvegarder et tester <ArrowRight className="w-4 h-4" /></>}
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Test */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-surface-900 dark:text-surface-50 mb-1">Testez votre agent</h2>
              <p className="text-sm text-surface-500">Lancez un test en mode simulation (gratuit) pour verifier le comportement.</p>
            </div>

            <button
              className="btn-primary w-full"
              onClick={handleTest}
              disabled={testRun.isPending}
            >
              {testRun.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Test en cours...</>
              ) : (
                <><Play className="w-4 h-4" /> Lancer le test (simulation)</>
              )}
            </button>

            {testResult !== null && (
              testResult.error ? (
                <div className="rounded-lg border border-red-200 dark:border-red-500/20 p-4">
                  <p className="text-sm text-red-600 dark:text-red-400">{String(testResult.error)}</p>
                </div>
              ) : (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-500/20 overflow-hidden">
                  <div className="px-4 py-2.5 bg-emerald-50 dark:bg-emerald-500/5 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Test reussi</span>
                  </div>
                  <div className="p-4 text-sm text-surface-700 dark:text-surface-300 whitespace-pre-wrap">
                    {String(testResult.text ?? "").slice(0, 500)}
                  </div>
                </div>
              )
            )}

            <div className="flex justify-between pt-2">
              <button className="btn-secondary text-sm" onClick={() => setStep(1)}>
                <ArrowLeft className="w-4 h-4" /> Modifier le prompt
              </button>
              <button className="btn-primary text-sm" onClick={() => setStep(3)}>
                Continuer <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Activate */}
        {step === 3 && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-gradient-to-br from-brand-50 to-emerald-50 dark:from-brand-500/10 dark:to-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto">
              <Sparkles className="w-8 h-8 text-brand-500" />
            </div>
            <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50">Pret a activer !</h2>
            <p className="text-sm text-surface-500 max-w-sm mx-auto">
              Votre agent <strong>{agent.name}</strong> est configure et teste. Activez-le pour qu'il commence a travailler automatiquement.
            </p>

            <div className="grid grid-cols-3 gap-3 py-4">
              <div className="p-3 rounded-lg bg-surface-50 dark:bg-white/[0.03] text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <div className="text-xs text-surface-500">Configure</div>
              </div>
              <div className="p-3 rounded-lg bg-surface-50 dark:bg-white/[0.03] text-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
                <div className="text-xs text-surface-500">Teste</div>
              </div>
              <div className="p-3 rounded-lg bg-brand-50 dark:bg-brand-500/5 text-center">
                <Play className="w-5 h-5 text-brand-500 mx-auto mb-1" />
                <div className="text-xs text-brand-700 dark:text-brand-300 font-medium">Pret</div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <button
                className="btn-primary w-full py-3"
                onClick={handleActivate}
                disabled={updateStatus.isPending}
              >
                {updateStatus.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Sparkles className="w-4 h-4" /> Activer l'agent</>
                )}
              </button>
              <button className="btn-secondary w-full text-sm" onClick={() => setStep(2)}>
                Retester avant d'activer
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function getCapabilities(type: string): string[] {
  const caps: Record<string, string[]> = {
    email: ["Classifier les emails par urgence et categorie", "Rediger des reponses professionnelles", "Escalader les cas complexes", "Filtrer le spam automatiquement"],
    commercial: ["Qualifier les leads (score 0-100)", "Generer des devis personalises", "Planifier des relances automatiques", "Suivi du pipeline commercial"],
    admin: ["Classifier les documents (factures, contrats...)", "Extraire les donnees cles", "Detecter les anomalies", "Archiver automatiquement"],
    support: ["Repondre aux clients 24/7", "Creer des tickets support", "Escalader les cas critiques", "Ton empathique et professionnel"],
    direction: ["Bilans quotidiens synthetiques", "Suivi des decisions", "Alertes sur les KPIs", "Recommandations strategiques"],
  };
  return caps[type] ?? ["Agent IA autonome"];
}
