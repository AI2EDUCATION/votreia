import Link from "next/link";
import { Mail, ArrowLeft } from "lucide-react";

export default function VerifyEmailPage() {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-brand-50 dark:bg-brand-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Mail className="w-8 h-8 text-brand-500" />
      </div>
      <h2 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-2">
        Verifiez votre email
      </h2>
      <p className="text-sm text-surface-500 mb-6 max-w-sm mx-auto">
        Un email de confirmation a ete envoye. Cliquez sur le lien dans l'email pour activer votre compte.
        Pensez a verifier vos spams.
      </p>
      <Link href="/auth/login" className="text-sm text-brand-600 hover:underline flex items-center justify-center gap-1">
        <ArrowLeft className="w-4 h-4" />
        Retour a la connexion
      </Link>
    </div>
  );
}
