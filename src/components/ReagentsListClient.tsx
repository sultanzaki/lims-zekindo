"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CreateReagentForm } from "@/components/InventoryForms";
import { bulkRelocateReagentsAction, exportReagentsAction } from "@/lib/actions/inventory";
import { exportToExcel } from "@/lib/exportExcel";
import StatChip from "@/components/ui/StatChip";
import EmptyState from "@/components/ui/EmptyState";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import CursorPager from "@/components/ui/CursorPager";
import type { CursorPageInfo } from "@/lib/pagination";

export type ReagentRow = {
  id: string;
  name: string;
  category: string;
  lotNumber: string;
  expiryLabel: string | null;
  locationName: string | null;
  quantityLabel: string;
  stockPct: number;
  stockColor: string;
  badgeLabel: string;
  badgeBg: string;
  badgeColor: string;
};

export type ReagentStockStats = { total: number; inStock: number; expiringSoon: number; lowStock: number; expired: number };

const SEARCH_DEBOUNCE_MS = 400;

export default function ReagentsListClient({
  reagents,
  locations,
  categories,
  stats,
  locationCount,
  initialQuery = "",
  initialCategory = "All",
  pageInfo,
}: {
  reagents: ReagentRow[];
  locations: { id: string; label: string }[];
  categories: string[];
  stats: ReagentStockStats;
  locationCount: number;
  initialQuery?: string;
  initialCategory?: string;
  pageInfo: CursorPageInfo;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(initialQuery);
  const [formOpen, setFormOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [relocateLocationId, setRelocateLocationId] = useState("");
  const [relocating, setRelocating] = useState(false);
  const [relocateError, setRelocateError] = useState("");
  const [relocateMessage, setRelocateMessage] = useState("");

  // Adjusted during render (React's documented pattern for resetting state
  // when a prop changes) so a server round-trip — e.g. browser back/forward
  // landing on different params — stays in sync without an extra effect
  // commit/cascading re-render.
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  if (initialQuery !== syncedQuery) {
    setSyncedQuery(initialQuery);
    setSearch(initialQuery);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setRelocateError("");
    setRelocateMessage("");
    setRelocateLocationId("");
  }

  async function submitRelocate() {
    setRelocateError("");
    setRelocateMessage("");
    setRelocating(true);
    const result = await bulkRelocateReagentsAction(Array.from(selectedIds), relocateLocationId);
    setRelocating(false);
    if ("error" in result) {
      setRelocateError(result.error);
      return;
    }
    setRelocateMessage(`Moved ${result.moved} reagent${result.moved === 1 ? "" : "s"}.`);
    setSelectedIds(new Set());
    router.refresh();
  }

  // Every filter change is a real server-side query now, so it always resets
  // pagination back to the first page — otherwise "after"/"before" from the
  // old position would carry over and paginate the wrong filtered set.
  function updateParams(patch: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.delete("after");
    sp.delete("before");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // Debounced so typing doesn't fire a server round-trip per keystroke.
  useEffect(() => {
    if (search === initialQuery) return;
    const handle = setTimeout(() => updateParams({ q: search || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setCategoryFilter(category: string) {
    updateParams({ category: category === "All" ? undefined : category });
  }

  // Exports the full filtered set (up to the server's cap), not just the
  // current page — a dedicated on-demand query rather than fetching
  // everything on every page load.
  async function handleExportExcel() {
    setExporting(true);
    try {
      const rows = await exportReagentsAction({ q: search, category: initialCategory });
      exportToExcel(`reagents-export-${new Date().toISOString().slice(0, 10)}.xlsx`, [
        {
          name: "Reagents",
          rows: rows.map((r) => ({
            Name: r.name,
            Category: r.category,
            "Lot Number": r.lotNumber,
            Expiry: r.expiryLabel ?? "",
            Location: r.locationName ?? "",
            Quantity: r.quantityLabel,
            Status: r.badgeLabel,
          })),
        },
      ]);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-7 pb-7 md:pb-9 flex flex-col gap-3.5 md:gap-5 md:max-w-[1400px] md:w-full">
      {/* Desktop header + toolbar */}
      <div className="hidden md:flex md:flex-wrap md:items-start md:justify-between md:gap-x-6 md:gap-y-2.5 md:pr-10">
        <div className="shrink-0">
          <div className="text-[20px] font-bold text-text tracking-tight whitespace-nowrap">Reagents &amp; Chemicals</div>
          <div className="text-[13px] text-muted mt-0.5">
            {stats.total} items tracked across {locationCount} storage location{locationCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="no-print flex flex-wrap items-center justify-end gap-2.5">
          <div className="flex items-center gap-2 h-[38px] px-3 rounded-[10px] bg-white border border-border w-[220px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#93A6B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reagents…"
              className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
            />
          </div>
          <select
            value={initialCategory}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-[38px] px-3 rounded-[10px] bg-white border border-border text-[13px] font-semibold text-[#5B6B74] cursor-pointer"
          >
            <option value="All">All categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleExportExcel}
            disabled={exporting}
            className="h-[38px] px-3 rounded-[10px] border border-border bg-white text-[13px] font-semibold text-primary-dark cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-60"
          >
            {exporting ? "Exporting…" : "Export Excel"}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="h-[38px] px-3 rounded-[10px] border border-border bg-white text-[13px] font-semibold text-primary-dark cursor-pointer whitespace-nowrap shrink-0"
          >
            Export PDF
          </button>
          <button
            type="button"
            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
            className="h-[38px] px-3 rounded-[10px] border border-border bg-white text-[13px] font-semibold text-text cursor-pointer whitespace-nowrap shrink-0"
          >
            {selectMode ? "Cancel" : "Select"}
          </button>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-glow-primary cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Reagent
          </button>
        </div>
      </div>

      {selectMode && (
        <div className="no-print hidden md:flex md:items-center md:gap-2.5 bg-white border border-border rounded-2xl shadow-card-sm px-4 py-2.5">
          <span className="text-[13px] font-semibold text-text shrink-0">{selectedIds.size} selected</span>
          <select
            value={relocateLocationId}
            onChange={(e) => setRelocateLocationId(e.target.value)}
            className="h-[34px] px-2.5 rounded-[10px] bg-white border border-border text-[13px] text-text"
          >
            <option value="">No location</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </select>
          <Button size="sm" fullWidth={false} disabled={selectedIds.size === 0 || relocating} onClick={submitRelocate}>
            {relocating ? "Moving…" : "Move to location"}
          </Button>
          {relocateError && <span className="text-xs text-danger">{relocateError}</span>}
          {relocateMessage && <span className="text-xs text-success-dark">{relocateMessage}</span>}
        </div>
      )}

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Reagent">
        <CreateReagentForm locations={locations} />
      </Modal>

      {/* Mobile: always-visible create form (unchanged) */}
      <div className="no-print md:hidden">
        <CreateReagentForm locations={locations} />
      </div>

      {/* Desktop stat strip */}
      <div className="hidden md:flex md:gap-2.5">
        <StatChip label="Total items" value={stats.total} />
        <StatChip label="In stock" value={stats.inStock} dotColor="#28A745" />
        <StatChip label="Expiring soon" value={stats.expiringSoon} dotColor="#F5A623" />
        <StatChip label="Low stock" value={stats.lowStock} tone="danger" />
        <StatChip label="Expired" value={stats.expired} tone="danger" />
      </div>

      {/* Mobile card feed */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {reagents.map((r) => (
          <Link key={r.id} href={`/inventory/reagents/${r.id}`} className="bg-white border border-border rounded-2xl shadow-card-sm px-4 py-3.5 block">
            <div className="flex items-start justify-between gap-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-text leading-snug">{r.name}</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-chip-bg text-muted shrink-0">{r.category}</span>
                </div>
                <div className="text-xs text-muted mt-0.5 font-mono-data">
                  Lot {r.lotNumber} {r.expiryLabel && `· exp ${r.expiryLabel}`}
                  {r.locationName && ` · ${r.locationName}`}
                </div>
              </div>
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0" style={{ background: r.badgeBg, color: r.badgeColor }}>
                {r.badgeLabel}
              </span>
            </div>
            <div className="flex items-center gap-2.5 mt-3">
              <div className="flex-1 h-[7px] rounded-full bg-[#EEF2F5] overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${r.stockPct}%`, background: r.stockColor }} />
              </div>
              <span className="text-xs font-semibold text-[#444] font-mono-data whitespace-nowrap">{r.quantityLabel}</span>
            </div>
          </Link>
        ))}
        {reagents.length === 0 && <EmptyState>No reagents tracked yet.</EmptyState>}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        {reagents.length === 0 ? (
          <EmptyState>{stats.total === 0 ? "No reagents tracked yet." : "No reagents match your search."}</EmptyState>
        ) : (
          <div className="bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-soft">
                    {selectMode && <th className="w-10 py-2.5 pl-4" />}
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-4">Name</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Lot</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Expiry</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Location</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Stock</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {reagents.map((r) => {
                    const selected = selectedIds.has(r.id);
                    return (
                    <tr
                      key={r.id}
                      onClick={() => selectMode && toggleSelect(r.id)}
                      className={`border-b border-border-soft last:border-b-0 hover:bg-chip-bg transition-colors ${selectMode ? "cursor-pointer" : ""} ${
                        r.badgeLabel === "Expired" || r.badgeLabel === "Low stock" ? "bg-danger-bg" : ""
                      }`}
                      style={{ background: selected ? "var(--color-primary-soft)" : undefined }}
                    >
                      {selectMode && (
                        <td className="py-2.5 pl-4">
                          <span
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                            style={{
                              borderColor: selected ? "var(--color-primary)" : "var(--color-border)",
                              background: selected ? "var(--color-primary)" : "transparent",
                            }}
                          >
                            {selected && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                        </td>
                      )}
                      <td className="py-2.5 px-4">
                        {selectMode ? (
                          <span className="text-[13px] font-semibold text-text">{r.name}</span>
                        ) : (
                          <Link href={`/inventory/reagents/${r.id}`} className="text-[13px] font-semibold text-primary-dark hover:underline">
                            {r.name}
                          </Link>
                        )}
                        <span className="ml-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-chip-bg text-muted">{r.category}</span>
                      </td>
                      <td className="py-2.5 px-3 text-[13px] text-muted font-mono-data whitespace-nowrap">{r.lotNumber}</td>
                      <td className="py-2.5 px-3 text-[13px] text-muted font-mono-data whitespace-nowrap">{r.expiryLabel ?? "—"}</td>
                      <td className="py-2.5 px-3 text-[13px] text-muted truncate max-w-[160px]">{r.locationName || "—"}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2 w-[140px]">
                          <div className="flex-1 h-[6px] rounded-full bg-[#EEF2F5] overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${r.stockPct}%`, background: r.stockColor }} />
                          </div>
                          <span className="text-[12px] font-semibold text-[#444] font-mono-data whitespace-nowrap">{r.quantityLabel}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 pr-4">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: r.badgeBg, color: r.badgeColor }}>
                          {r.badgeLabel}
                        </span>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <CursorPager {...pageInfo} />
      </div>
    </div>
  );
}
