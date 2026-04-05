import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-[#0f1117]">
      <div className="text-center max-w-md px-8">
        <div className="text-8xl font-bold text-gradient mb-6">404</div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-surface-50 mb-3">
          Page introuvable
        </h1>
        <p className="text-sm text-surface-500 mb-8 leading-relaxed">
          La page que vous cherchez n'existe pas ou a ete deplacee.
          Verifiez l'URL ou retournez au tableau de bord.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/dashboard" className="btn-primary">
            <Home className="w-4 h-4" />
            Tableau de bord
          </Link>
          <Link href="/" className="btn-secondary">
            <ArrowLeft className="w-4 h-4" />
            Accueil
          </Link>
        </div>
      </div>
    </div>
  );
}
