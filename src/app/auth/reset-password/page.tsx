"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createSupabaseBrowser();

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  }

  if (sent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-2">
          Email envoye
        </h2>
        <p className="text-sm text-surface-500 mb-6">
          Un lien de reinitialisation a ete envoye a <strong>{email}</strong>.
          Verifiez votre boite mail (et les spams).
        </p>
        <Link href="/auth/login" className="text-sm text-brand-600 hover:underline flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour a la connexion
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">V</div>
        <span className="text-xl font-bold tracking-tight">VotrIA</span>
      </div>

      <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-1">Mot de passe oublie</h1>
      <p className="text-sm text-surface-500 mb-8">
        Entrez votre email pour recevoir un lien de reinitialisation.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-300 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleReset}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1.5">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.fr"
                className="input pl-10"
                required
                autoFocus
              />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Envoyer le lien
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-6 text-center">
        <Link href="/auth/login" className="text-sm text-brand-600 hover:underline flex items-center justify-center gap-1">
          <ArrowLeft className="w-4 h-4" />
          Retour a la connexion
        </Link>
      </div>
    </div>
  );
}
