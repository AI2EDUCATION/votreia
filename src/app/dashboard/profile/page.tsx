"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc-client";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "next/navigation";
import { User, Mail, Shield, Calendar, Save, Check, Loader2, Download } from "lucide-react";

export default function ProfilePage() {
  const { data: profile, isLoading } = trpc.profile.get.useQuery();
  const [fullName, setFullName] = useState("");
  const [saved, setSaved] = useState(false);
  const router = useRouter();
  const { success, error: toastError } = useToast();

  useEffect(() => {
    if (profile) setFullName(profile.fullName ?? "");
  }, [profile]);

  const updateProfile = trpc.profile.update.useMutation({
    onSuccess: () => {
      setSaved(true);
      success("Profil mis a jour");
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    },
    onError: (err) => toastError("Erreur", err.message),
  });

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/trpc/profile.exportData", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: {} }),
      });
      if (!res.ok) throw new Error("Export failed");
      const data = await res.json();
      const exportData = data?.result?.data?.json ?? data?.result?.data ?? data;

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `votria-export-${new Date().toISOString().split("T")[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      success("Export RGPD termine", "Fichier JSON telecharge.");
    } catch {
      toastError("Erreur", "Impossible d'exporter les donnees.");
    } finally {
      setExporting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 max-w-2xl animate-pulse">
        <div className="h-7 w-32 skeleton rounded" />
        <div className="card p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 skeleton rounded-full" />
            <div><div className="h-5 w-40 skeleton rounded mb-2" /><div className="h-4 w-56 skeleton rounded" /></div>
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const initials = profile.fullName
    ? profile.fullName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : profile.email[0].toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50">Mon profil</h1>
        <p className="text-sm text-surface-500 mt-1">Gerez vos informations personnelles</p>
      </div>

      {/* Avatar + info */}
      <div className="card p-6">
        <div className="flex items-center gap-5 mb-6">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.fullName ?? ""} className="w-16 h-16 rounded-full object-cover ring-4 ring-surface-100 dark:ring-white/10" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white text-xl font-bold ring-4 ring-surface-100 dark:ring-white/10">
              {initials}
            </div>
          )}
          <div>
            <h2 className="text-lg font-semibold text-surface-900 dark:text-surface-50">{profile.fullName ?? "Sans nom"}</h2>
            <p className="text-sm text-surface-500">{profile.email}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-surface-400">
              <span className="flex items-center gap-1"><Shield className="w-3 h-3" /> {profile.role}</span>
              {profile.lastLogin && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Derniere connexion: {new Date(profile.lastLogin).toLocaleDateString("fr-FR")}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div className="space-y-4 pt-4 border-t border-surface-100 dark:border-white/[0.06]">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Nom complet</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input pl-10"
                placeholder="Jean Dupont"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input type="email" value={profile.email} className="input pl-10 opacity-60 cursor-not-allowed" disabled />
            </div>
            <p className="text-xs text-surface-400 mt-1">L'email ne peut pas etre modifie.</p>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              className="btn-primary text-sm"
              onClick={() => updateProfile.mutate({ fullName: fullName || undefined })}
              disabled={updateProfile.isPending || fullName === (profile.fullName ?? "")}
            >
              {updateProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <><Check className="w-4 h-4" /> Enregistre</> : <><Save className="w-4 h-4" /> Enregistrer</>}
            </button>
          </div>
        </div>
      </div>

      {/* RGPD Export */}
      <div className="card p-6">
        <h3 className="font-semibold text-sm text-surface-900 dark:text-surface-50 mb-1">Donnees personnelles (RGPD)</h3>
        <p className="text-xs text-surface-400 mb-4">
          Exportez toutes vos donnees dans un fichier JSON conforme au RGPD.
        </p>
        <button className="btn-secondary text-sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Exporter mes donnees
        </button>
      </div>
    </div>
  );
}
