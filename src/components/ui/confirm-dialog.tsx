"use client";

import { Modal } from "./modal";
import { AlertTriangle, Loader2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  variant = "default",
  loading = false,
}: ConfirmDialogProps) {
  const btnClass = variant === "danger" ? "btn-danger" : variant === "warning" ? "btn-primary" : "btn-primary";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className="btn-secondary text-sm" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </button>
          <button className={`${btnClass} text-sm`} onClick={onConfirm} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-4">
        {variant === "danger" && (
          <div className="w-10 h-10 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
        )}
        {variant === "warning" && (
          <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
        )}
        <p className="text-sm text-surface-600 dark:text-surface-400 leading-relaxed">{description}</p>
      </div>
    </Modal>
  );
}
