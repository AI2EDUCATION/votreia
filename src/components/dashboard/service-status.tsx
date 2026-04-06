"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

interface ServiceCheck {
  name: string;
  status: "ok" | "error" | "loading";
  latencyMs?: number;
  error?: string;
}

export function ServiceStatus() {
  const [checks, setChecks] = useState<ServiceCheck[]>([
    { name: "Application", status: "loading" },
    { name: "Base de donnees", status: "loading" },
    { name: "Anthropic (Claude API)", status: "loading" },
    { name: "Stripe", status: "loading" },
    { name: "Redis (cache)", status: "loading" },
    { name: "Resend (emails)", status: "loading" },
  ]);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [fetching, setFetching] = useState(false);

  async function fetchHealth() {
    setFetching(true);
    try {
      const res = await fetch("/api/health", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        const c = data.checks ?? {};
        setChecks([
          { name: "Application", status: "ok", latencyMs: 0 },
          { name: "Base de donnees", status: c.database?.status ?? "error", latencyMs: c.database?.latencyMs, error: c.database?.error },
          { name: "Anthropic (Claude API)", status: c.anthropic?.status ?? "error", error: c.anthropic?.error },
          { name: "Stripe", status: c.stripe?.status ?? "error", error: c.stripe?.error },
          { name: "Redis (cache)", status: c.redis?.status ?? "error", latencyMs: c.redis?.latencyMs, error: c.redis?.error },
          { name: "Resend (emails)", status: c.resend?.status ?? "error", error: c.resend?.error },
        ]);
      } else {
        setChecks((prev) => prev.map((c) => ({ ...c, status: "error" as const })));
      }
    } catch {
      setChecks([
        { name: "Application", status: "error", error: "Injoignable" },
        { name: "Base de donnees", status: "error" },
        { name: "Anthropic (Claude API)", status: "error" },
        { name: "Stripe", status: "error" },
        { name: "Redis (cache)", status: "error" },
        { name: "Resend (emails)", status: "error" },
      ]);
    } finally {
      setFetching(false);
      setLastChecked(new Date());
    }
  }

  useEffect(() => {
    fetchHealth();
  }, []);

  const allOk = checks.every((c) => c.status === "ok");
  const anyError = checks.some((c) => c.status === "error");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {allOk ? (
            <span className="badge-success">Tous les services operationnels</span>
          ) : anyError ? (
            <span className="badge-danger">Services degrades</span>
          ) : (
            <span className="badge-info">Verification...</span>
          )}
        </div>
        <button
          className="btn-ghost text-xs px-2 py-1"
          onClick={fetchHealth}
          disabled={fetching}
        >
          {fetching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="space-y-1.5">
        {checks.map((check) => (
          <div
            key={check.name}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-surface-50 dark:bg-white/[0.02]"
          >
            <div className="flex items-center gap-2">
              {check.status === "ok" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : check.status === "error" ? (
                <XCircle className="w-4 h-4 text-red-500" />
              ) : (
                <Loader2 className="w-4 h-4 text-surface-400 animate-spin" />
              )}
              <span className="text-sm text-surface-700 dark:text-surface-300">{check.name}</span>
            </div>
            <div className="text-xs text-surface-400 tabular-nums">
              {check.latencyMs !== undefined && check.status === "ok" && `${check.latencyMs}ms`}
              {check.error && <span className="text-red-400">{check.error}</span>}
            </div>
          </div>
        ))}
      </div>

      {lastChecked && (
        <p className="text-[10px] text-surface-400 text-right">
          Derniere verification : {lastChecked.toLocaleTimeString("fr-FR")}
        </p>
      )}
    </div>
  );
}
