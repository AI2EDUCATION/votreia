"use client";

import { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { logError } from "@/lib/error-handler";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logError(error, {
      context: "error_boundary",
      componentStack: errorInfo.componentStack ?? undefined,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="card p-8 text-center max-w-md mx-auto mt-12">
            <div className="w-12 h-12 bg-red-50 dark:bg-red-500/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">
              Quelque chose s'est mal passe
            </h3>
            <p className="text-sm text-surface-500 mb-4">
              Une erreur inattendue est survenue. Veuillez reessayer.
            </p>
            {process.env.NODE_ENV !== "production" && this.state.error && (
              <pre className="text-xs text-left bg-surface-50 dark:bg-white/[0.03] p-3 rounded-lg mb-4 overflow-auto max-h-32 text-red-600 dark:text-red-400">
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined });
                window.location.reload();
              }}
              className="btn-primary text-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Reessayer
            </button>
          </div>
        )
      );
    }

    return this.props.children;
  }
}

export function LoadingSkeleton({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`animate-pulse space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 skeleton rounded"
          style={{ width: `${70 + Math.random() * 30}%` }}
        />
      ))}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card p-12 text-center">
      <div className="w-16 h-16 bg-surface-50 dark:bg-white/[0.03] rounded-2xl flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">{title}</h3>
      <p className="text-sm text-surface-500 max-w-sm mx-auto mb-6">{description}</p>
      {action}
    </div>
  );
}
