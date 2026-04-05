"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Building2, User, ArrowRight, Loader2 } from "lucide-react";

export default function SignupPage() {
  const [form, setForm] = useState({
    fullName: "",
    company: "",
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createSupabaseBrowser();

  function update(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error: signupError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName,
            company: form.company,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signupError) {
        setError(signupError.message);
        setLoading(false);
        return;
      }

      // If email confirmation is disabled, user is immediately signed in
      if (data.session) {
        // Create tenant + user via API
        await fetch("/api/onboarding", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user?.id,
            fullName: form.fullName,
            company: form.company,
            email: form.email,
          }),
        });

        router.push("/dashboard");
      } else {
        // Email confirmation required
        router.push("/auth/login?message=check-email");
      }
    } catch (err) {
      setError("Une erreur est survenue. Veuillez réessayer.");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="lg:hidden flex items-center gap-2 mb-8">
        <div className="w-9 h-9 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold">
          V
        </div>
        <span className="text-xl font-bold tracking-tight">VotrIA</span>
      </div>

      <h1 className="text-2xl font-bold text-surface-900 mb-1">Créer un compte</h1>
      <p className="text-sm text-surface-500 mb-8">
        14 jours d'essai gratuit, sans engagement
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Nom complet
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                value={form.fullName}
                onChange={(e) => update("fullName", e.target.value)}
                placeholder="Jean Dupont"
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Entreprise
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="text"
                value={form.company}
                onChange={(e) => update("company", e.target.value)}
                placeholder="Mon Entreprise SAS"
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Email professionnel
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="jean@entreprise.fr"
                className="input pl-10"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1.5">
              Mot de passe
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => update("password", e.target.value)}
                placeholder="8 caractères minimum"
                className="input pl-10"
                minLength={8}
                required
              />
            </div>
          </div>

          {/* Password strength */}
          {form.password.length > 0 && (
            <PasswordStrength password={form.password} />
          )}

          <button type="submit" disabled={loading || form.password.length < 8} className="btn-primary w-full">
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Creer mon compte
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>

      <p className="mt-4 text-xs text-surface-400 text-center">
        En creant un compte, vous acceptez nos{" "}
        <a href="#" className="text-brand-600 hover:underline">CGU</a> et notre{" "}
        <a href="#" className="text-brand-600 hover:underline">politique de confidentialite</a> RGPD.
      </p>

      <div className="mt-8 text-center text-sm text-surface-500">
        Deja un compte ?{" "}
        <Link href="/auth/login" className="text-brand-600 font-medium hover:underline">
          Se connecter
        </Link>
      </div>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: "8 caracteres minimum", ok: password.length >= 8 },
    { label: "Une majuscule", ok: /[A-Z]/.test(password) },
    { label: "Un chiffre", ok: /\d/.test(password) },
    { label: "Un caractere special", ok: /[^A-Za-z0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.ok).length;
  const colors = ["bg-red-500", "bg-red-500", "bg-amber-500", "bg-amber-400", "bg-emerald-500"];
  const labels = ["Tres faible", "Faible", "Moyen", "Bon", "Excellent"];

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${i < score ? colors[score] : "bg-surface-200 dark:bg-white/10"}`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs text-surface-400">{labels[score]}</span>
        <div className="flex gap-3">
          {checks.map((check) => (
            <span
              key={check.label}
              className={`text-[10px] ${check.ok ? "text-emerald-600 dark:text-emerald-400" : "text-surface-400"}`}
            >
              {check.ok ? "✓" : "○"} {check.label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
