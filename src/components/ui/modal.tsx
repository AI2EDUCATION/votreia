"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, description, children, footer }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="overlay-backdrop flex items-center justify-center p-4" onClick={onClose}>
      <div
        ref={dialogRef}
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <h2 className="font-semibold text-surface-900 dark:text-surface-50">{title}</h2>
            {description && (
              <p className="text-xs text-surface-400 mt-0.5">{description}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-100 dark:hover:bg-white/5 text-surface-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}
