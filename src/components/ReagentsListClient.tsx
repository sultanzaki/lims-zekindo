"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CreateReagentForm } from "@/components/InventoryForms";
import StatChip from "@/components/ui/StatChip";
import EmptyState from "@/components/ui/EmptyState";

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

export default function ReagentsListClient({
  reagents,
  locations,
}: {
  reagents: ReagentRow[];
  locations: { id: string; label: string }[];
}) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [formOpen, setFormOpen] = useState(false);

  const categories = useMemo(() => ["All", ...Array.from(new Set(reagents.map((r) => r.category))).sort()], [reagents]);

  const stats = useMemo(() => {
    const inStock = reagents.filter((r) => r.badgeLabel === "In stock").length;
    const expiringSoon = reagents.filter((r) => r.badgeLabel === "Expiring soon").length;
    const lowStock = reagents.filter((r) => r.badgeLabel === "Low stock").length;
    const expired = reagents.filter((r) => r.badgeLabel === "Expired").length;
    const locationCount = new Set(reagents.map((r) => r.locationName).filter(Boolean)).size;
    return { inStock, expiringSoon, lowStock, expired, locationCount };
  }, [reagents]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reagents.filter((r) => {
      if (categoryFilter !== "All" && r.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        r.name.toLowerCase().includes(q) ||
        r.lotNumber.toLowerCase().includes(q) ||
        (r.locationName ?? "").toLowerCase().includes(q)
      );
    });
  }, [reagents, search, categoryFilter]);

  return (
    <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-7 pb-7 md:pb-9 flex flex-col gap-3.5 md:gap-5 md:max-w-[1400px] md:w-full">
      {/* Desktop header + toolbar */}
      <div className="hidden md:flex md:items-start md:justify-between md:gap-6 md:pr-10">
        <div>
          <div className="text-[20px] font-bold text-text tracking-tight">Reagents &amp; Chemicals</div>
          <div className="text-[13px] text-muted mt-0.5">
            {reagents.length} items tracked across {stats.locationCount} storage location{stats.locationCount === 1 ? "" : "s"}
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
              placeholder="Search reagents…"
              className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-[38px] px-3 rounded-[10px] bg-white border border-border text-[13px] font-semibold text-[#5B6B74] cursor-pointer"
          >
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All categories" : c}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setFormOpen((v) => !v)}
            className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-glow-primary cursor-pointer"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {formOpen ? "Close" : "Add Reagent"}
          </button>
        </div>
      </div>

      {formOpen && (
        <div className="hidden md:block md:max-w-[640px]">
          <CreateReagentForm locations={locations} />
        </div>
      )}

      {/* Mobile: always-visible create form (unchanged) */}
      <div className="md:hidden">
        <CreateReagentForm locations={locations} />
      </div>

      {/* Desktop stat strip */}
      <div className="hidden md:flex md:gap-2.5">
        <StatChip label="Total items" value={reagents.length} />
        <StatChip label="In stock" value={stats.inStock} dotColor="#28A745" />
        <StatChip label="Expiring soon" value={stats.expiringSoon} dotColor="#F5A623" />
        <StatChip label="Low stock" value={stats.lowStock} tone="danger" />
        <StatChip label="Expired" value={stats.expired} tone="danger" />
      </div>

      {/* Mobile card feed (unchanged) */}
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
        {filtered.length === 0 ? (
          <EmptyState>{reagents.length === 0 ? "No reagents tracked yet." : "No reagents match your search."}</EmptyState>
        ) : (
          <div className="bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-soft">
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-4">Name</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Lot</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Expiry</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Location</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Stock</th>
                    <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3 pr-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b border-border-soft last:border-b-0 hover:bg-chip-bg transition-colors ${
                        r.badgeLabel === "Expired" || r.badgeLabel === "Low stock" ? "bg-danger-bg" : ""
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        <Link href={`/inventory/reagents/${r.id}`} className="text-[13px] font-semibold text-primary-dark hover:underline">
                          {r.name}
                        </Link>
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
