"use client";

import ExcelJS from "exceljs";

export type ExportSheet = { name: string; rows: Record<string, string | number | null>[] };

// One shared entry point for every "Export Excel" button in the app —
// mirrors the existing CSV helpers' Blob + detached <a download> convention
// (see AuditLogClient.tsx / SamplesClient.tsx), just producing a real
// .xlsx workbook instead of a CSV string. Columns are derived from each
// sheet's first row so callers don't need to declare a column list.
export async function exportToExcel(filename: string, sheets: ExportSheet[]) {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  for (const sheet of sheets) {
    // Sheet names are capped at 31 chars and can't repeat — trim defensively
    // rather than letting exceljs throw on a caller's longer/duplicate name.
    const worksheet = workbook.addWorksheet(sheet.name.slice(0, 31));
    if (sheet.rows.length === 0) {
      worksheet.addRow(["No data"]);
      continue;
    }
    const keys = Object.keys(sheet.rows[0]);
    worksheet.columns = keys.map((key) => ({ header: key, key, width: Math.max(12, key.length + 2) }));
    worksheet.addRows(sheet.rows);
    worksheet.getRow(1).font = { bold: true };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
