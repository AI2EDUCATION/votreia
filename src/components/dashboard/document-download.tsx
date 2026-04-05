"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

export function DocumentDownloadButton({ docId }: { docId: string }) {
  const [loading, setLoading] = useState(false);
  const { error: toastError } = useToast();

  async function handleDownload() {
    setLoading(true);
    try {
      const res = await fetch(`/api/documents/download?id=${docId}`);
      const data = await res.json();

      if (!res.ok) {
        toastError("Echec", data.error ?? "Impossible de telecharger");
        return;
      }

      // Open signed URL in new tab
      window.open(data.url, "_blank");
    } catch {
      toastError("Erreur", "Impossible de telecharger le document.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button className="btn-ghost text-xs px-2 py-1" onClick={handleDownload} disabled={loading}>
      {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
    </button>
  );
}
