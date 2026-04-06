"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      onClick={handleCopy}
      className="btn-ghost text-xs px-2 py-1 gap-1"
      title={label ?? "Copier"}
    >
      {copied ? (
        <><Check className="w-3 h-3 text-emerald-500" /> Copie</>
      ) : (
        <><Copy className="w-3 h-3" /> {label ?? "Copier"}</>
      )}
    </button>
  );
}
