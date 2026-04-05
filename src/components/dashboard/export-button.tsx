"use client";

import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: { key: string; label: string }[];
}

export function ExportCSVButton({ data, filename, columns }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);
  const { success } = useToast();

  function handleExport() {
    setExporting(true);
    try {
      const header = columns.map((c) => c.label).join(",");
      const rows = data.map((row) =>
        columns
          .map((c) => {
            const val = row[c.key];
            const str = val === null || val === undefined ? "" : String(val);
            // Escape CSV values
            return str.includes(",") || str.includes('"') || str.includes("\n")
              ? `"${str.replace(/"/g, '""')}"`
              : str;
          })
          .join(",")
      );

      const csv = [header, ...rows].join("\n");
      const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = url;
      link.download = `${filename}.csv`;
      link.click();

      URL.revokeObjectURL(url);
      success("Export termine", `${data.length} lignes exportees.`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      className="btn-secondary text-sm"
      onClick={handleExport}
      disabled={exporting || data.length === 0}
    >
      {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      Exporter CSV
    </button>
  );
}
