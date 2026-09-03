"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CreateEquipmentForm } from "@/components/InventoryForms";
import { bulkRelocateEquipmentAction, exportEquipmentAction } from "@/lib/actions/inventory";
import { exportToExcel } from "@/lib/exportExcel";
import StatChip from "@/components/ui/StatChip";
import EmptyState from "@/components/ui/EmptyState";
import Chevron from "@/components/ui/Chevron";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import CursorPager from "@/components/ui/CursorPager";
import type { CursorPageInfo } from "@/lib/pagination";

export type EquipmentRow = {
  id: string;
  assetTag: string;
  name: string;
  locationName: string | null;
  status: string;
  statusBg: string;
  statusColor: string;
  statusDot: string;
  calibrationLabel: string | null;
  overdue: boolean;
};

export type EquipmentStatusStats = { total: number; operational: number; underMaintenance: number; outOfService: number; overdue: number };

const STATUS_OPTIONS = ["All", "Operational", "Under Maintenance", "Out of Service"];
const SEARCH_DEBOUNCE_MS = 400;

export default function EquipmentListClient({
  equipment,
  locations,
  stats,
  locationCount,
  initialQuery = "",
  initialStatus = "All",
  pageInfo,
}: {
  equipment: EquipmentRow[];
  locations: { id: string; label: string }[];
  stats: EquipmentStatusStats;
  locationCount: number;
  initialQuery?: string;
  initialStatus?: string;
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
  // when a prop changes) so a server round-trip stays in sync without an
  // extra effect commit/cascading re-render.
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
    const result = await bulkRelocateEquipmentAction(Array.from(selectedIds), relocateLocationId);
    setRelocating(false);
    if ("error" in result) {
      setRelocateError(result.error);
      return;
    }
    setRelocateMessage(`Moved ${result.moved} item${result.moved === 1 ? "" : "s"}.`);
    setSelectedIds(new Set());
    router.refresh();
  }

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

  useEffect(() => {
    if (search === initialQuery) return;
    const handle = setTimeout(() => updateParams({ q: search || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function setStatusFilter(status: string) {
    updateParams({ status: status === "All" ? undefined : status });
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      const rows = await exportEquipmentAction({ q: search, status: initialStatus });
      exportToExcel(`equipment-export-${new Date().toISOString().slice(0, 10)}.xlsx`, [
        {
          name: "Equipment",
          rows: rows.map((e) => ({
            "Asset Tag": e.assetTag,
            Name: e.name,
            Location: e.locationName ?? "",
            "Calibration Due": e.calibrationLabel ?? "",
            Status: e.status,
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
          <div className="text-[20px] font-bold text-text tracking-tight whitespace-nowrap">Equipment</div>
          <div className="text-[13px] text-muted mt-0.5">
            {stats.total} assets tracked across {locationCount} storage location{locationCount === 1 ? "" : "s"}
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
              placeholder="Search equipment…"
              className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
            />
          </div>
          <select
            value={initialStatus}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-[38px] px-3 rounded-[10px] bg-white border border-border text-[13px] font-semibold text-[#5B6B74] cursor-pointer"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All statuses" : s}
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
            Add Equipment
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Equipment">
        <CreateEquipmentForm locations={locations} />
      </Modal>

      {/* Mobile: always-visible create form (unchanged) */}
      <div className="no-print md:hidden">
        <CreateEquipmentForm locations={locations} />
      </div>

      {/* Desktop stat strip */}
      <div className="hidden md:flex md:gap-2.5">
        <StatChip label="Total assets" value={stats.total} />
        <StatChip label="Operational" value={stats.operational} dotColor="#28A745" />
        <StatChip label="Under maintenance" value={stats.underMaintenance} dotColor="#F5A623" />
        <StatChip label="Out of service" value={stats.outOfService} dotColor="#D0021B" />
        <StatChip label="Calibration overdue" value={stats.overdue} tone="danger" />
      </div>

      {/* Mobile card feed */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {equipment.map((e) => (
          <Link key={e.id} href={`/inventory/equipment/${e.id}`} className="bg-white border border-border rounded-[18px] shadow-card px-4 py-3.5">
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: e.statusDot }} />
                <span className="text-xs font-semibold text-muted font-mono-data truncate">{e.assetTag}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: e.statusBg, color: e.statusColor }}>
                  {e.status}
                </span>
                <Chevron />
              </div>
            </div>
            <div className="text-[15px] font-semibold text-text mt-2 leading-snug tracking-tight">{e.name}</div>
            <div className="text-[13px] text-muted mt-0.5">{e.locationName || "—"}</div>
            {e.calibrationLabel && (
              <div className="flex items-center gap-1.5 mt-3 pt-2.5 border-t border-border-soft">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={e.overdue ? "#D0021B" : "#7A8B94"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4" />
                  <path d="M16 3v4" />
                  <path d="M3 10h18" />
                </svg>
                <span className="text-xs font-semibold" style={{ color: e.overdue ? "#D0021B" : "#7A8B94" }}>
                  Calibration due {e.calibrationLabel}
                </span>
              </div>
            )}
          </Link>
        ))}
        {equipment.length === 0 && <EmptyState>No equipment tracked yet.</EmptyState>}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block">
        {equipment.length === 0 ? (
          <EmptyState>{stats.total === 0 ? "No equipment tracked yet." : "No equipment matches your search."}</EmptyState>
        ) : (
          <div className="bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-soft">
                    {selectMode && <th className="w-10 py-2.5 pl-4" />}
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-4">Asset Tag</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Name</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Location</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Calibration Due</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {equipment.map((e) => {
                    const selected = selectedIds.has(e.id);
                    return (
                    <tr
                      key={e.id}
                      onClick={() => selectMode && toggleSelect(e.id)}
                      className={`border-b border-border-soft last:border-b-0 hover:bg-chip-bg transition-colors ${selectMode ? "cursor-pointer" : ""} ${e.overdue ? "bg-danger-bg" : ""}`}
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
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        {selectMode ? (
                          <span className="text-[13px] font-semibold text-text font-mono-data">{e.assetTag}</span>
                        ) : (
                          <Link href={`/inventory/equipment/${e.id}`} className="text-[13px] font-semibold text-primary-dark font-mono-data hover:underline">
                            {e.assetTag}
                          </Link>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-[13px] text-text font-medium truncate max-w-[220px]">{e.name}</td>
                      <td className="py-2.5 px-3 text-[13px] text-muted truncate max-w-[160px]">{e.locationName || "—"}</td>
                      <td className="py-2.5 px-3 text-[13px] whitespace-nowrap" style={{ color: e.overdue ? "#D0021B" : "#5B6B74" }}>
                        {e.calibrationLabel ?? "—"}
                      </td>
                      <td className="py-2.5 px-3 pr-4">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap" style={{ background: e.statusBg, color: e.statusColor }}>
                          {e.status}
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
