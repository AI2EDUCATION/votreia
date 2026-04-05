"use client";

import { createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
}

interface ToastContextValue {
  toast: (params: { type: ToastType; title: string; description?: string }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
  warning: (title: string, description?: string) => void;
  info: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const counterRef = useRef(0);

  const addToast = useCallback((params: { type: ToastType; title: string; description?: string }) => {
    const id = `toast-${++counterRef.current}`;
    setToasts((prev) => [...prev, { id, ...params }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, description) => addToast({ type: "success", title, description }),
    error: (title, description) => addToast({ type: "error", title, description }),
    warning: (title, description) => addToast({ type: "warning", title, description }),
    info: (title, description) => addToast({ type: "info", title, description }),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <Info className="w-5 h-5 text-brand-500" />,
  };

  const borders = {
    success: "border-l-emerald-500",
    error: "border-l-red-500",
    warning: "border-l-amber-500",
    info: "border-l-brand-500",
  };

  return (
    <div
      className={`pointer-events-auto bg-white dark:bg-[#1a1d2e] border border-surface-200 dark:border-white/10 rounded-xl shadow-elevation-3 p-4 flex items-start gap-3 animate-slide-up border-l-4 ${borders[toast.type]}`}
    >
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-surface-900 dark:text-surface-50">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-surface-500 mt-0.5">{toast.description}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-0.5 rounded hover:bg-surface-100 dark:hover:bg-white/5 text-surface-400 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
