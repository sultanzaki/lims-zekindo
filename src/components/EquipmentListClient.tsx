"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreateEquipmentForm } from "@/components/InventoryForms";
import StatChip from "@/components/ui/StatChip";
import EmptyState from "@/components/ui/EmptyState";
import Chevron from "@/components/ui/Chevron";
import Modal from "@/components/ui/Modal";

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

const STATUS_OPTIONS = ["All", "Operational", "Under Maintenance", "Out of Service"];

export default function EquipmentListClient({
  equipment,
  locations,
}: {
  equipment: EquipmentRow[];
  locations: { id: string; label: string }[];
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);

  const stats = useMemo(() => {
    const operational = equipment.filter((e) => e.status === "Operational").length;
    const underMaintenance = equipment.filter((e) => e.status === "Under Maintenance").length;
    const outOfService = equipment.filter((e) => e.status === "Out of Service").length;
    const overdue = equipment.filter((e) => e.overdue).length;
    const locationCount = new Set(equipment.map((e) => e.locationName).filter(Boolean)).size;
    return { operational, underMaintenance, outOfService, overdue, locationCount };
  }, [equipment]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipment.filter((e) => {
      if (statusFilter !== "All" && e.status !== statusFilter) return false;
      if (!q) return true;
      return (
        e.assetTag.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.locationName ?? "").toLowerCase().includes(q)
      );
    });
  }, [equipment, search, statusFilter]);

  return (
    <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-7 pb-7 md:pb-9 flex flex-col gap-3.5 md:gap-5 md:max-w-[1400px] md:w-full">
      {/* Desktop header + toolbar */}
      <div className="hidden md:flex md:items-start md:justify-between md:gap-6 md:pr-10">
        <div>
          <div className="text-[20px] font-bold text-text tracking-tight">Equipment</div>
          <div className="text-[13px] text-muted mt-0.5">
            {equipment.length} assets tracked across {stats.locationCount} storage location{stats.locationCount === 1 ? "" : "s"}
          </div>
        </div>
        <div className="flex items-center gap-2.5">
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
            value={statusFilter}
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

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Equipment">
        <CreateEquipmentForm locations={locations} />
      </Modal>

      {/* Mobile: always-visible create form (unchanged) */}
      <div className="md:hidden">
        <CreateEquipmentForm locations={locations} />
      </div>

      {/* Desktop stat strip */}
      <div className="hidden md:flex md:gap-2.5">
        <StatChip label="Total assets" value={equipment.length} />
        <StatChip label="Operational" value={stats.operational} dotColor="#28A745" />
        <StatChip label="Under maintenance" value={stats.underMaintenance} dotColor="#F5A623" />
        <StatChip label="Out of service" value={stats.outOfService} dotColor="#D0021B" />
        <StatChip label="Calibration overdue" value={stats.overdue} tone="danger" />
      </div>

      {/* Mobile card feed (unchanged) */}
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
        {filtered.length === 0 ? (
          <EmptyState>{equipment.length === 0 ? "No equipment tracked yet." : "No equipment matches your search."}</EmptyState>
        ) : (
          <div className="bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[680px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-soft">
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-4">Asset Tag</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Name</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Location</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Calibration Due</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((e) => (
                    <tr key={e.id} className={`border-b border-border-soft last:border-b-0 hover:bg-chip-bg transition-colors ${e.overdue ? "bg-danger-bg" : ""}`}>
                      <td className="py-2.5 px-4 whitespace-nowrap">
                        <Link href={`/inventory/equipment/${e.id}`} className="text-[13px] font-semibold text-primary-dark font-mono-data hover:underline">
                          {e.assetTag}
                        </Link>
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
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
