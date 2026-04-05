"use client";

import { useState } from "react";
import { Plus, Upload } from "lucide-react";
import { CreateLeadModal } from "@/components/dashboard/create-lead-modal";
import { ImportLeadsModal } from "@/components/dashboard/import-leads-modal";

export function LeadsPageClient() {
  const [createOpen, setCreateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        <button className="btn-secondary text-sm" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4" />
          Importer CSV
        </button>
        <button className="btn-primary" onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          Nouveau lead
        </button>
      </div>
      <CreateLeadModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <ImportLeadsModal open={importOpen} onClose={() => setImportOpen(false)} />
    </>
  );
}
