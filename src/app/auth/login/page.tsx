"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [magicSent, setMagicSent] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const supabase = createSupabaseBrowser();

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${redirectTo}`,
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMagicSent(true);
    }
    setLoading(false);
  }

  if (magicSent) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Mail className="w-8 h-8 text-brand-500" />
        </div>
        <h2 className="text-xl font-bold text-surface-900 mb-2">
          Vérifiez votre email
        </h2>
        <p className="text-sm text-surface-500 mb-6">
          Un lien de connexion a été envoyé à <strong>{email}</strong>
        </p>
        <button
          onClick={() => setMagicSent(false)}
          className="text-sm text-brand-600 hover:underline"
        >
          Utiliser un autre email
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">
          V
        </div>
        <span className="text-xl font-bold tracking-tight">VotrIA</span>
      </div>

      <h1 className="text-2xl font-bold text-surface-900 mb-1">Connexion</h1>
      <p className="text-sm text-surface-500 mb-8">
        Accédez à votre tableau de bord
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={mode === "password" ? handlePasswordLogin : handleMagicLink}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom@entreprise.fr"
                className="input pl-10"
                required
              />
            </div>
          </div>

          {mode === "password" && (
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10"
                  required
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                {mode === "password" ? "Se connecter" : "Envoyer le lien magique"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={() => setMode(mode === "password" ? "magic" : "password")}
          className="text-sm text-brand-600 hover:underline"
        >
          {mode === "password"
            ? "Lien magique"
            : "Mot de passe"}
        </button>
        {mode === "password" && (
          <Link href="/auth/reset-password" className="text-sm text-surface-500 hover:text-surface-700 dark:hover:text-surface-300 hover:underline">
            Mot de passe oublie ?
          </Link>
        )}
      </div>

      <div className="mt-8 text-center text-sm text-surface-500">
        Pas encore de compte ?{" "}
        <Link href="/auth/signup" className="text-brand-600 font-medium hover:underline">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
