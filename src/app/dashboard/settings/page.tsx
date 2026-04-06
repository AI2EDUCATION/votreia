"use client";

import { useState, useEffect } from "react";
import { Settings, Globe, Bell, Shield, Trash2, LogOut, Save, Check, ExternalLink, Loader2, Lock, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc-client";
import { ServiceStatus } from "@/components/dashboard/service-status";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("general");

  const tabs = [
    { id: "general", label: "General", icon: Settings },
    { id: "notifications", label: "Notifications", icon: Bell },
    { id: "security", label: "Securite", icon: Shield },
    { id: "integrations", label: "Integrations", icon: Globe },
    { id: "status", label: "Statut", icon: Activity },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Parametres</h1>
        <p className="text-sm text-surface-500 mt-1">
          Configuration de votre espace VotrIA
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6">
        <div className="sm:w-48 shrink-0 flex sm:flex-col gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all shrink-0 ${
                  activeTab === tab.id
                    ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300 shadow-sm"
                    : "text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-white/[0.04]"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 card p-6 animate-fade-in">
          {activeTab === "general" && <GeneralTab />}
          {activeTab === "notifications" && <NotificationsTab />}
          {activeTab === "security" && <SecurityTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "status" && <StatusTab />}
        </div>
      </div>
    </div>
  );
}

function GeneralTab() {
  const { data: settings, isLoading } = trpc.settings.get.useQuery();
  const [name, setName] = useState("");
  const [timezone, setTimezone] = useState("Europe/Paris");
  const [language, setLanguage] = useState("fr");
  const [domain, setDomain] = useState("");

  useEffect(() => {
    if (settings) {
      setName(settings.name ?? "");
      const s = settings.settings as Record<string, string> | null;
      setTimezone(s?.timezone ?? "Europe/Paris");
      setLanguage(s?.language ?? "fr");
      setDomain(s?.domain ?? "");
    }
  }, [settings]);

  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => setSaved(true),
    onError: (err) => alert(err.message),
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (saved) {
      const t = setTimeout(() => setSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [saved]);

  function handleSave() {
    updateSettings.mutate({
      name: name || undefined,
      settings: { timezone, language, domain },
    });
  }

  if (isLoading) {
    return <div className="space-y-4 animate-pulse">
      <div className="h-5 w-40 skeleton rounded" />
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-10 skeleton rounded-lg" />)}
      </div>
    </div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-1">Informations entreprise</h3>
        <p className="text-xs text-surface-400 mb-4">Ces informations sont utilisees par vos agents IA.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Nom de l'entreprise</label>
            <input type="text" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mon Entreprise SAS" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Fuseau horaire</label>
            <select className="input" value={timezone} onChange={(e) => setTimezone(e.target.value)}>
              <option value="Europe/Paris">Europe/Paris</option>
              <option value="Europe/Brussels">Europe/Brussels</option>
              <option value="Europe/London">Europe/London</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Langue</label>
            <select className="input" value={language} onChange={(e) => setLanguage(e.target.value)}>
              <option value="fr">Francais</option>
              <option value="en">English</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Domaine</label>
            <input type="text" className="input" value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="entreprise.fr" />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-surface-100 dark:border-white/[0.06] flex items-center gap-3">
        <button className="btn-primary text-sm" onClick={handleSave} disabled={updateSettings.isPending}>
          {updateSettings.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <><Check className="w-4 h-4" /> Enregistre</>
          ) : (
            <><Save className="w-4 h-4" /> Enregistrer</>
          )}
        </button>
        {saved && <span className="text-xs text-emerald-600 dark:text-emerald-400 animate-fade-in">Modifications enregistrees</span>}
      </div>
    </div>
  );
}

function NotificationsTab() {
  const { data: settings } = trpc.settings.get.useQuery();
  const updateSettings = trpc.settings.update.useMutation();

  const currentPrefs = (settings?.settings as Record<string, Record<string, boolean>> | null)?.notificationPreferences ?? {};

  function togglePref(key: string, value: boolean) {
    updateSettings.mutate({
      settings: {
        notificationPreferences: { [key]: value },
      },
    });
  }

  const prefs = [
    { key: "email", label: "Rapports quotidiens par email", desc: "Bilan des agents chaque matin a 8h", defaultOn: true },
    { key: "sms", label: "Alertes SMS urgentes", desc: "Erreurs critiques et escalades", defaultOn: false },
    { key: "browserNotifications", label: "Notifications navigateur", desc: "Alertes temps reel dans le dashboard", defaultOn: true },
    { key: "weeklyReport", label: "Resume hebdomadaire", desc: "KPIs de la semaine chaque lundi", defaultOn: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-1">Preferences de notification</h3>
        <p className="text-xs text-surface-400 mb-4">Choisissez comment et quand recevoir vos alertes.</p>
      </div>
      {prefs.map((pref) => (
        <div key={pref.key} className="flex items-center justify-between py-3.5 border-b border-surface-100 dark:border-white/[0.06] last:border-0">
          <div>
            <div className="text-sm font-medium text-surface-800 dark:text-surface-200">{pref.label}</div>
            <div className="text-xs text-surface-400 mt-0.5">{pref.desc}</div>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={currentPrefs[pref.key] ?? pref.defaultOn}
              onChange={(e) => togglePref(pref.key, e.target.checked)}
            />
            <div className="toggle-track" />
          </label>
        </div>
      ))}
    </div>
  );
}

function SecurityTab() {
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 8) return;
    setChangingPassword(true);
    try {
      const { createSupabaseBrowser } = await import("@/lib/supabase-browser");
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 3000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Erreur lors du changement de mot de passe.");
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleLogoutAll() {
    const { createSupabaseBrowser } = await import("@/lib/supabase-browser");
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut({ scope: "global" });
    window.location.href = "/auth/login";
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-1">Securite</h3>
        <p className="text-xs text-surface-400 mb-4">Gerez la securite de votre compte et vos donnees.</p>
      </div>

      {/* Change password */}
      <div className="space-y-3">
        <div className="p-4 rounded-lg border border-surface-200 dark:border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-surface-400" />
            <span className="text-sm font-medium text-surface-800 dark:text-surface-200">Changer le mot de passe</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Nouveau mot de passe (8+ caracteres)"
              className="input flex-1"
              minLength={8}
            />
            <button
              className="btn-primary text-sm shrink-0"
              onClick={handleChangePassword}
              disabled={changingPassword || newPassword.length < 8}
            >
              {changingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : passwordSaved ? <><Check className="w-4 h-4" /> OK</> : "Modifier"}
            </button>
          </div>
        </div>

        <button className="btn-secondary text-sm w-full justify-start">
          <Globe className="w-4 h-4 text-surface-400" />
          Exporter mes donnees (RGPD)
        </button>
        <button
          className="btn-secondary text-sm w-full justify-start text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-500/10"
          onClick={handleLogoutAll}
        >
          <LogOut className="w-4 h-4" />
          Se deconnecter de tous les appareils
        </button>
      </div>

      <div className="pt-6 border-t border-surface-100 dark:border-white/[0.06]">
        <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-1">Zone de danger</h4>
        <p className="text-xs text-surface-400 mb-3">Actions irreversibles. Procedez avec precaution.</p>
        {deleting ? (
          <div className="flex items-center gap-3">
            <button className="btn-danger text-sm" onClick={() => { /* Would call delete API */ }}>
              <Trash2 className="w-4 h-4" />
              Confirmer la suppression
            </button>
            <button className="btn-secondary text-sm" onClick={() => setDeleting(false)}>
              Annuler
            </button>
          </div>
        ) : (
          <button className="btn-danger text-sm" onClick={() => setDeleting(true)}>
            <Trash2 className="w-4 h-4" />
            Supprimer mon compte et toutes les donnees
          </button>
        )}
      </div>
    </div>
  );
}

function IntegrationsTab() {
  const integrations = [
    { name: "Gmail", desc: "Connectez votre boite Gmail pour l'agent Email", icon: "✉️", connected: false, href: "/api/auth/gmail", color: "border-red-200 dark:border-red-500/20" },
    { name: "Outlook", desc: "Connectez votre boite Outlook / O365", icon: "📧", connected: false, href: "#", color: "border-blue-200 dark:border-blue-500/20" },
    { name: "Stripe", desc: "Paiement et facturation automatique", icon: "💳", connected: true, href: "#", color: "border-violet-200 dark:border-violet-500/20" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-1">Integrations</h3>
        <p className="text-xs text-surface-400 mb-4">Connectez vos outils pour activer vos agents IA.</p>
      </div>
      {integrations.map((integration) => (
        <div
          key={integration.name}
          className={`flex items-center justify-between p-4 rounded-xl border ${integration.color} bg-surface-50/50 dark:bg-white/[0.02] transition-all hover:shadow-sm`}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl w-10 h-10 flex items-center justify-center">{integration.icon}</span>
            <div>
              <div className="text-sm font-medium text-surface-800 dark:text-surface-200">{integration.name}</div>
              <div className="text-xs text-surface-400">{integration.desc}</div>
            </div>
          </div>
          {integration.connected ? (
            <div className="flex items-center gap-2">
              <span className="badge-success">Connecte</span>
              <button className="btn-ghost text-xs px-2 py-1">
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <a href={integration.href} className="btn-primary text-sm">Connecter</a>
          )}
        </div>
      ))}
    </div>
  );
}

function StatusTab() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-surface-900 dark:text-surface-50 mb-1">Statut des services</h3>
        <p className="text-xs text-surface-400 mb-4">Verifiez la connectivite de tous les services externes.</p>
      </div>
      <ServiceStatus />
    </div>
  );
}
