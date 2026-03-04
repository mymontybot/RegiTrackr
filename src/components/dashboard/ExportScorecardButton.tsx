"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

type ExportScorecardButtonProps = {
  clientId: string;
};

export function ExportScorecardButton({ clientId }: ExportScorecardButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleExport = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/clients/${clientId}/export/scorecard`, {
        method: "GET",
      });
      if (!response.ok) {
        throw new Error("Failed to export scorecard");
      }

      const blob = await response.blob();
      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/i);
      const filename = filenameMatch?.[1] ?? `ComplianceScorecard-${clientId}.pdf`;

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={isLoading}
      className="inline-flex items-center gap-2 rounded-lg border border-[#2A3F66] px-3 py-1.5 text-sm font-medium text-slate-300 transition-colors hover:bg-[#111D35] hover:text-slate-100 disabled:opacity-60"
    >
      {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Export PDF
    </button>
  );
}
