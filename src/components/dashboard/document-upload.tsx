"use client";

import { useState, useRef } from "react";
import { Upload, Loader2, Folder } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/toast";

export function DocumentUploadButton() {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { success, error: toastError } = useToast();

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toastError("Echec de l'upload", data.error ?? "Erreur inconnue");
        return;
      }

      success("Document importe", `${file.name} est en cours de traitement.`);
      router.refresh();
    } catch {
      toastError("Erreur", "Impossible d'importer le fichier.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      <button
        className="btn-primary"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
        {uploading ? "Import en cours..." : "Importer"}
      </button>
    </>
  );
}

export function DocumentDropZone() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const { success, error: toastError } = useToast();

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toastError("Echec de l'upload", data.error ?? "Erreur inconnue");
        return;
      }

      success("Document importe", `${file.name} est en cours de traitement.`);
      router.refresh();
    } catch {
      toastError("Erreur", "Impossible d'importer le fichier.");
    } finally {
      setUploading(false);
      setDragging(false);
    }
  }

  return (
    <div
      className={`card border-2 border-dashed p-12 text-center transition-colors cursor-pointer group ${
        dragging
          ? "border-brand-400 bg-brand-50/50 dark:border-brand-500/30 dark:bg-brand-500/5"
          : "border-surface-300 dark:border-white/10 hover:border-brand-400 dark:hover:border-brand-500/30"
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleUpload(file);
        }}
      />
      <div className="w-16 h-16 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-500/10 dark:to-orange-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
        {uploading ? (
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        ) : (
          <Folder className="w-8 h-8 text-amber-500" />
        )}
      </div>
      <h3 className="text-lg font-semibold text-surface-900 dark:text-surface-50 mb-2">
        {uploading ? "Import en cours..." : dragging ? "Deposez votre fichier" : "Deposez vos documents ici"}
      </h3>
      <p className="text-sm text-surface-500 max-w-sm mx-auto mb-6">
        Importez vos factures, contrats et documents. L'agent Admin les
        classera et extraira les donnees automatiquement.
      </p>
      {!uploading && (
        <>
          <button className="btn-primary pointer-events-none">
            <Upload className="w-4 h-4" />
            Parcourir les fichiers
          </button>
          <p className="text-xs text-surface-400 mt-3">PDF, Word, Excel, Images — Max 20 Mo</p>
        </>
      )}
    </div>
  );
}
