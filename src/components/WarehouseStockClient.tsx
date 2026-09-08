"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import StatChip from "@/components/ui/StatChip";
import EmptyState from "@/components/ui/EmptyState";
import CursorPager from "@/components/ui/CursorPager";
import { exportToExcel } from "@/lib/exportExcel";
import type { CursorPageInfo } from "@/lib/pagination";
import { parseCsv, mapHeaderToField, normalizeRow, validateParsedRows, type WarehouseStockRow } from "@/lib/warehouse-stock";
import { importWarehouseStockAction, deleteWarehouseStockUploadAction, exportWarehouseStockAction } from "@/lib/actions/warehouse-stock";

export type WarehouseUploadMeta = {
  id: string;
  label: string;
  fileName: string;
  rowCount: number;
  importedBy: string;
  importedAt: string;
};

export type WarehouseItemRow = {
  id: string;
  location: string;
  productRef: string;
  productName: string;
  lotNumber: string;
  vendorLotNumber: string;
  vendorPackaging: string;
  unit: string;
  quantity: number;
};

type Stats = { rows: number; products: number; locations: number; zeroQty: number };

const SEARCH_DEBOUNCE_MS = 400;

function formatDate(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WarehouseStockClient({
  uploads,
  activeUploadId,
  activeUploadLabel,
  items,
  stats,
  locations,
  initialQuery = "",
  initialLocation = "",
  pageInfo,
}: {
  uploads: WarehouseUploadMeta[];
  activeUploadId: string;
  activeUploadLabel: string;
  items: WarehouseItemRow[];
  stats: Stats;
  locations: string[];
  initialQuery?: string;
  initialLocation?: string;
  pageInfo: CursorPageInfo;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [loc, setLoc] = useState(initialLocation);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [deleting, setDeleting] = useState(false);

  // --- upload wizard state ---
  const [fileName, setFileName] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [preview, setPreview] = useState<WarehouseStockRow[] | null>(null);
  const [matchedFields, setMatchedFields] = useState<string[]>([]);
  const [parseError, setParseError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with server-driven query params.
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  if (initialQuery !== syncedQuery) {
    setSyncedQuery(initialQuery);
    setQuery(initialQuery);
  }
  const [syncedLoc, setSyncedLoc] = useState(initialLocation);
  if (initialLocation !== syncedLoc) {
    setSyncedLoc(initialLocation);
    setLoc(initialLocation);
  }

  function updateParams(patch: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v) sp.set(k, v);
      else sp.delete(k);
    }
    sp.delete("after");
    sp.delete("before");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  useEffect(() => {
    if (query === initialQuery) return;
    const handle = setTimeout(() => updateParams({ q: query || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useEffect(() => {
    if (loc === initialLocation) return;
    const handle = setTimeout(() => updateParams({ loc: loc || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loc]);

  function selectUpload(id: string) {
    updateParams({ upload: id || undefined, q: undefined, loc: undefined });
  }

  async function handleDeleteUpload() {
    if (!activeUploadId) return;
    if (!window.confirm("Delete this warehouse stock snapshot and all its rows? This cannot be undone.")) return;
    setDeleting(true);
    setImportError("");
    setImportMessage("");
    const result = await deleteWarehouseStockUploadAction(activeUploadId);
    setDeleting(false);
    if ("error" in result && result.error) {
      setImportError(result.error);
      return;
    }
    setImportMessage("Snapshot deleted.");
    router.refresh();
    router.replace(pathname);
  }

  async function handleFile(file: File | undefined | null) {
    setParseError("");
    setImportError("");
    setPreview(null);
    setMatchedFields([]);
    setFileName("");
    if (!file) return;
    const isCsv = /\.csv$/i.test(file.name);
    const isExcel = /\.(xlsx|xls)$/i.test(file.name);
    if (!isCsv && !isExcel) {
      setParseError("Unsupported file. Upload a .csv or .xlsx export from the Stock Ending report.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setParseError("File too large (max 15 MB).");
      return;
    }
    setFileName(file.name);

    try {
      if (isCsv) {
        const text = await file.text();
        const table = parseCsv(text);
        const outcome = rowsFromTable(table);
        if (!outcome.ok) {
          setParseError(outcome.error);
          return;
        }
        setPreview(outcome.rows);
        setMatchedFields(outcome.matchedFields);
        // auto-suggest label from the file name (e.g. "0303 Stock Ending …")
        if (!label) setLabel(deriveLabelFromFileName(file.name));
      } else {
        // Excel path — parse client-side with exceljs (already a lazy dep for
        // export). Only the first worksheet is read.
        const ExcelJS = await import("exceljs");
        const workbook = new ExcelJS.Workbook();
        const buf = await file.arrayBuffer();
        await workbook.xlsx.load(buf);
        const ws = workbook.worksheets[0];
        if (!ws) {
          setParseError("No worksheet found in the Excel file.");
          return;
        }
        const table: string[][] = [];
        ws.eachRow({ includeEmpty: false }, (row) => {
          const vals = row.values as (unknown)[];
          vals.shift(); // exceljs row.values[0] is the row number
          table.push(vals.map((v) => (v === undefined || v === null ? "" : String(v))));
        });
        const outcome = rowsFromTable(table);
        if (!outcome.ok) {
          setParseError(outcome.error);
          return;
        }
        setPreview(outcome.rows);
        setMatchedFields(outcome.matchedFields);
        if (!label) setLabel(deriveLabelFromFileName(file.name));
      }
    } catch (e) {
      setParseError(`Could not read the file: ${e instanceof Error ? e.message : "unknown error"}`);
    }
  }

  // Column matching used for both CSV and Excel preview paths — delegates to
  // the shared lib so preview and server-side persisted behavior stay in sync.
  function rowsFromTable(table: string[][]) {
    const headers = table[0] ?? [];
    const matched = new Set<keyof WarehouseStockRow>();
    const headerMap = new Map<number, keyof WarehouseStockRow>();
    headers.forEach((h, i) => {
      const f = mapHeaderToField(h);
      if (f) {
        matched.add(f);
        if (![...headerMap.values()].includes(f)) headerMap.set(i, f);
      }
    });
    const rows: WarehouseStockRow[] = [];
    for (let r = 1; r < table.length; r++) {
      const raw = table[r];
      const obj: Record<string, unknown> = {};
      raw.forEach((v, i) => {
        obj[i] = v;
      });
      const row = normalizeRow(obj, headerMap);
      if (!row.productName && !row.lotNumber && !row.location && row.quantity === 0) continue;
      rows.push(row);
    }
    const matchedFields = [...matched];
    const outcome = validateParsedRows(rows, matchedFields);
    if (!outcome.ok) return outcome;
    return { ok: true as const, rows, matchedFields, missingRequired: [] };
  }

  function deriveLabelFromFileName(name: string) {
    const base = name.replace(/\.(csv|xlsx|xls)$/i, "").replace(/[_]+/g, " ").trim();
    return base.slice(0, 80);
  }

  async function confirmImport() {
    if (!preview || !fileName || !label.trim()) return;
    setImporting(true);
    setImportError("");
    setImportMessage("");
    const result = await importWarehouseStockAction({
      label: label.trim(),
      notes: notes.trim() || undefined,
      fileName,
      rows: preview,
    });
    setImporting(false);
    if ("error" in result && result.error) {
      setImportError(result.error);
      return;
    }
    if ("ok" in result && result.ok) {
      setImportMessage(`Imported ${result.rowCount.toLocaleString()} rows.`);
      setUploadOpen(false);
      setPreview(null);
      setFileName("");
      setLabel("");
      setNotes("");
      setMatchedFields([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      router.refresh();
      router.replace(`${pathname}?upload=${result.uploadId}`);
    }
  }

  async function handleExportExcel() {
    if (!activeUploadId) return;
    try {
      const rows = await exportWarehouseStockAction({ uploadId: activeUploadId, q: query || undefined, loc: loc || undefined });
      if (rows.length === 0) return;
      await exportToExcel(`warehouse-stock-${(activeUploadLabel || "export").replace(/[^a-z0-9]+/gi, "-") || "export"}.xlsx`, [
        {
          name: "Warehouse Stock",
          rows: rows.map((r) => ({
            Location: r.location,
            "Product Reference": r.productRef,
            "Product Name": r.productName,
            "Lot Number": r.lotNumber,
            "Vendor Lot Number": r.vendorLotNumber,
            "Vendor Packaging": r.vendorPackaging,
            Unit: r.unit,
            Qty: r.quantity,
          })),
        },
      ]);
    } finally {
      // no-op
    }
  }

  const areaOptions = useMemo(() => {
    const areas = new Set<string>();
    for (const l of locations) {
      const first = l.split("/")[0]?.trim();
      if (first) areas.add(first);
    }
    return [...areas].sort();
  }, [locations]);

  return (
    <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-7 pb-7 md:pb-9 flex flex-col gap-3.5 md:gap-5 md:max-w-[1400px] md:w-full">
      {/* Header */}
      <div className="hidden md:flex md:flex-wrap md:items-start md:justify-between md:gap-x-6 md:gap-y-2.5 md:pr-10">
        <div className="shrink-0">
          <div className="text-[20px] font-bold text-text tracking-tight whitespace-nowrap">Warehouse Stock</div>
          <div className="text-[13px] text-muted mt-0.5">
            {stats.rows > 0
              ? `${stats.rows.toLocaleString()} lot lines · ${stats.locations} locations · ${stats.products} product refs`
              : "Factory chemical stock snapshots from the Stock Ending report"}
          </div>
        </div>
        <div className="no-print flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={items.length === 0}
            className="h-[38px] px-3 rounded-[10px] border border-border bg-white text-[13px] font-semibold text-primary-dark cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            Export Excel
          </button>
          <button
            type="button"
            onClick={() => {
              setImportError("");
              setImportMessage("");
              setParseError("");
              setPreview(null);
              setFileName("");
              setLabel("");
              setNotes("");
              if (fileInputRef.current) fileInputRef.current.value = "";
              setUploadOpen(true);
            }}
            className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-glow-primary cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            Import Snapshot
          </button>
        </div>
      </div>

      {/* Upload history / period selector */}
      {uploads.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-muted shrink-0">Period:</span>
          <select
            value={activeUploadId}
            onChange={(e) => selectUpload(e.target.value)}
            className="h-[34px] px-2.5 rounded-[10px] bg-white border border-border text-[13px] font-semibold text-text cursor-pointer"
          >
            {uploads.map((u) => (
              <option key={u.id} value={u.id}>
                {u.label} — {u.rowCount.toLocaleString()} rows ({formatDate(u.importedAt)})
              </option>
            ))}
          </select>
          {uploads.length > 0 && (
            <span className="text-[11px] text-faint hidden md:inline">
              imported by {uploads.find((u) => u.id === activeUploadId)?.importedBy ?? "—"}
            </span>
          )}
          {uploads.length > 0 && (
            <button
              type="button"
              onClick={handleDeleteUpload}
              disabled={deleting}
              className="ml-auto text-[11px] font-semibold text-danger hover:underline cursor-pointer disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Delete this snapshot"}
            </button>
          )}
        </div>
      )}

      {/* Mobile import + title */}
      <div className="md:hidden flex items-center justify-between gap-2">
        <div>
          <div className="text-[18px] font-bold text-text tracking-tight">Warehouse Stock</div>
          <div className="text-xs text-muted mt-0.5">{stats.rows.toLocaleString()} rows · {activeUploadLabel}</div>
        </div>
        <button
          type="button"
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] bg-primary text-white text-[13px] font-semibold cursor-pointer shrink-0"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Import
        </button>
      </div>

      {/* Filters */}
      <div className="no-print flex flex-col md:flex-row gap-2.5">
        <div className="flex items-center gap-2 h-[38px] px-3 rounded-[10px] bg-white border border-border w-full md:w-[260px]">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#93A6B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search product, lot, ref…"
            className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
          />
        </div>
        <select
          value={loc}
          onChange={(e) => setLoc(e.target.value)}
          className="h-[38px] px-3 rounded-[10px] bg-white border border-border text-[13px] font-semibold text-[#5B6B74] cursor-pointer md:w-[240px]"
        >
          <option value="">All areas</option>
          {areaOptions.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {/* Desktop stat strip */}
      <div className="hidden md:flex md:gap-2.5">
        <StatChip label="Total lot lines" value={stats.rows.toLocaleString()} />
        <StatChip label="Product refs" value={stats.products.toLocaleString()} />
        <StatChip label="Locations" value={stats.locations.toLocaleString()} />
        <StatChip label="Zero stock" value={stats.zeroQty.toLocaleString()} tone={stats.zeroQty > 0 ? "danger" : "default"} />
      </div>

      {importMessage && <div className="text-xs text-success-dark bg-[#E6F4EA] border border-[#C6E8CE] rounded-xl px-3 py-2">{importMessage}</div>}

      {/* Mobile cards */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {items.map((r) => (
          <div key={r.id} className="bg-white border border-border rounded-2xl shadow-card-sm px-4 py-3">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text leading-snug">{r.productName}</div>
                {r.productRef && <div className="text-[11px] text-muted font-mono-data mt-0.5">{r.productRef}</div>}
                <div className="text-xs text-muted mt-1 truncate">{r.location}</div>
                <div className="text-[11px] text-faint font-mono-data mt-0.5">Lot {r.lotNumber}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-sm font-bold font-mono-data">{r.quantity.toLocaleString()}</div>
                <div className="text-[11px] text-muted">{r.unit}</div>
              </div>
            </div>
          </div>
        ))}
        {items.length === 0 && <EmptyState>No rows in this snapshot{query || loc ? " match your filters" : ""}.</EmptyState>}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        {items.length === 0 ? (
          <EmptyState>{stats.rows === 0 ? "No warehouse stock imported yet — upload a Stock Ending snapshot above." : "No rows match your filters."}</EmptyState>
        ) : (
          <div className="bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-soft">
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-4">Product</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Lot</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Location</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Packaging</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3 pr-4 text-right">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((r) => (
                    <tr key={r.id} className="border-b border-border-soft last:border-b-0 hover:bg-chip-bg transition-colors">
                      <td className="py-2.5 px-4">
                        <div className="text-[13px] font-semibold text-text">{r.productName}</div>
                        {r.productRef && <div className="text-[11px] text-muted font-mono-data mt-0.5">{r.productRef}</div>}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="text-[12px] text-muted font-mono-data whitespace-nowrap">{r.lotNumber}</div>
                        {r.vendorLotNumber && <div className="text-[10.5px] text-faint font-mono-data whitespace-nowrap mt-0.5">{r.vendorLotNumber}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-[12.5px] text-muted max-w-[220px] truncate">{r.location}</td>
                      <td className="py-2.5 px-3 text-[12.5px] text-muted whitespace-nowrap">{r.vendorPackaging || "—"}</td>
                      <td className="py-2.5 px-3 pr-4 text-right">
                        <span className={`text-[13px] font-bold font-mono-data ${r.quantity === 0 ? "text-[#B00016]" : "text-text"}`}>
                          {r.quantity.toLocaleString()}
                        </span>{" "}
                        <span className="text-[11px] text-muted">{r.unit}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <CursorPager {...pageInfo} />
      </div>

      {/* Upload modal */}
      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Import Warehouse Stock Snapshot" maxWidth="560px">
        <div className="flex flex-col gap-3">
          <p className="text-xs text-muted leading-relaxed">
            Upload the plant&apos;s <span className="font-semibold text-text">Stock Ending</span> CSV/Excel export. The file stays a snapshot
            tied to this period; upload a new one each month to keep history.
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="block w-full text-[13px] text-text file:mr-3 file:py-2 file:px-3 file:rounded-[10px] file:border-0 file:bg-primary-soft file:text-primary-dark file:font-semibold file:cursor-pointer"
          />
          {parseError && <div className="text-xs text-danger bg-danger-bg border border-[#F6CDD1] rounded-xl px-3 py-2">{parseError}</div>}
          {fileName && preview && (
            <>
              <div className="text-xs text-muted">
                <span className="font-semibold text-text">{fileName}</span> — {preview.length.toLocaleString()} rows parsed. Columns matched:{" "}
                <span className="text-primary-dark">{matchedFields.join(", ") || "none"}</span>
              </div>
              <div className="text-xs text-faint">Preview (first 3 rows):</div>
              <div className="border border-border rounded-xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="bg-[#FAFCFD] border-b border-border-soft text-faint uppercase tracking-wide">
                      <th className="px-2 py-1.5">Location</th>
                      <th className="px-2 py-1.5">Product</th>
                      <th className="px-2 py-1.5">Lot</th>
                      <th className="px-2 py-1.5 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 3).map((r, i) => (
                      <tr key={i} className="border-b border-border-soft last:border-b-0">
                        <td className="px-2 py-1.5 text-muted truncate max-w-[140px]">{r.location}</td>
                        <td className="px-2 py-1.5 text-text font-medium truncate max-w-[160px]">{r.productName}</td>
                        <td className="px-2 py-1.5 font-mono-data text-muted truncate max-w-[110px]">{r.lotNumber}</td>
                        <td className="px-2 py-1.5 font-mono-data text-right">{r.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {fileName && !preview && !parseError && <div className="text-xs text-muted">Parsing file…</div>}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted">Period label *</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. 0303 Stock Ending"
              className="rounded-[10px] border border-border px-3 h-[38px] text-[13px] text-text outline-none focus:border-primary"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-muted">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Source report period, quirks, etc."
              className="rounded-[10px] border border-border px-3 py-2 text-[13px] text-text outline-none focus:border-primary resize-none"
            />
          </label>
          {importError && <div className="text-xs text-danger bg-danger-bg border border-[#F6CDD1] rounded-xl px-3 py-2">{importError}</div>}
          <div className="flex items-center justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={!preview || !label.trim() || importing} onClick={confirmImport}>
              {importing ? "Importing…" : `Import ${preview ? preview.length.toLocaleString() : ""} rows`}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
