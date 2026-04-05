"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-[#0f1117] font-sans">
        <div className="text-center max-w-md px-8">
          <div className="w-16 h-16 bg-red-50 dark:bg-red-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-xl font-bold text-surface-900 dark:text-surface-50 mb-2">
            Erreur inattendue
          </h1>
          <p className="text-sm text-surface-500 mb-6">
            Une erreur est survenue. Notre equipe a ete notifiee.
          </p>
          {error.digest && (
            <p className="text-xs text-surface-400 mb-4 font-mono">
              Ref: {error.digest}
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <button
              onClick={reset}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reessayer
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-white/5 text-surface-700 dark:text-surface-200 rounded-lg text-sm font-medium border border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/10 transition-colors"
            >
              <Home className="w-4 h-4" />
              Dashboard
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
