"use client";

import { useState, useEffect } from "react";
import { Shield, X } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("votria-cookie-consent");
    if (!consent) {
      // Show after small delay to not block initial render
      const t = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(t);
    }
  }, []);

  function accept() {
    localStorage.setItem("votria-cookie-consent", "accepted");
    setVisible(false);
  }

  function decline() {
    localStorage.setItem("votria-cookie-consent", "declined");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-[100] animate-slide-up">
      <div className="bg-white dark:bg-[#1a1d2e] rounded-xl border border-surface-200 dark:border-white/10 shadow-elevation-3 p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 dark:bg-brand-500/10 flex items-center justify-center shrink-0">
            <Shield className="w-4 h-4 text-brand-600 dark:text-brand-400" />
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-semibold text-surface-900 dark:text-surface-50 mb-1">
              Respect de votre vie privee
            </h4>
            <p className="text-xs text-surface-500 leading-relaxed mb-3">
              VotrIA utilise des cookies essentiels pour le fonctionnement de l'application.
              Aucun cookie publicitaire ou de tracking tiers n'est utilise.
              Vos donnees restent en France (RGPD).
            </p>
            <div className="flex items-center gap-2">
              <button onClick={accept} className="btn-primary text-xs py-1.5 px-3">
                Accepter
              </button>
              <button onClick={decline} className="btn-ghost text-xs py-1.5 px-3">
                Refuser
              </button>
              <a href="#" className="text-[10px] text-surface-400 hover:underline ml-auto">
                Politique de confidentialite
              </a>
            </div>
          </div>
          <button onClick={decline} className="p-1 rounded hover:bg-surface-100 dark:hover:bg-white/5 text-surface-400 shrink-0">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
