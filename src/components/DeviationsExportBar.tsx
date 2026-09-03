"use client";

import { exportToExcel } from "@/lib/exportExcel";

export type DeviationExportRow = {
  sampleId: string;
  status: string;
  severity: string;
  description: string;
  assigneeName: string;
  dueDate: string;
  openedAt: string;
};

export default function DeviationsExportBar({ rows }: { rows: DeviationExportRow[] }) {
  function handleExportExcel() {
    exportToExcel(`deviations-export-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: "Deviations",
        rows: rows.map((d) => ({
          "Sample ID": d.sampleId,
          Status: d.status,
          Severity: d.severity,
          Description: d.description,
          "Assigned To": d.assigneeName,
          "Due Date": d.dueDate,
          Opened: d.openedAt,
        })),
      },
    ]);
  }

  return (
    <div className="no-print flex items-center gap-2 self-end">
      <button
        type="button"
        onClick={handleExportExcel}
        className="text-xs font-semibold text-primary px-2.5 py-1.5 rounded-full border border-border bg-white cursor-pointer"
      >
        Export Excel
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="text-xs font-semibold text-primary px-2.5 py-1.5 rounded-full border border-border bg-white cursor-pointer"
      >
        Export PDF
      </button>
    </div>
  );
}
