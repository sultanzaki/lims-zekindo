"use client";

import { useMemo, useState } from "react";
import { CreateBusinessUnitForm } from "@/components/CatalogForms";
import Modal from "@/components/ui/Modal";
import BusinessUnitPortalRow from "@/components/BusinessUnitPortalRow";
import StatChip from "@/components/ui/StatChip";
import { setBusinessUnitActiveAction } from "@/lib/actions/catalog";

export type BusinessUnitRow = {
  id: string;
  name: string;
  active: boolean;
  portalUrl: string | null;
};

export default function BusinessUnitsListClient({ units }: { units: BusinessUnitRow[] }) {
  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);

  const stats = useMemo(() => {
    const active = units.filter((u) => u.active).length;
    const portalEnabled = units.filter((u) => u.portalUrl).length;
    return { active, inactive: units.length - active, portalEnabled };
  }, [units]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return units;
    return units.filter((u) => u.name.toLowerCase().includes(q));
  }, [units, search]);

  return (
    <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-7 pb-7 md:pb-9 flex flex-col gap-4 md:gap-5 md:max-w-[1200px] md:w-full">
      <p className="text-xs text-muted -mt-1 md:hidden">
        The requesting business units that samples can be logged against — managed separately from the sample &amp; test catalog.
      </p>

      {/* Desktop header + toolbar */}
      <div className="hidden md:flex md:items-start md:justify-between md:gap-6 md:pr-10">
        <div>
          <div className="text-[20px] font-bold text-text tracking-tight">Business Units</div>
          <div className="text-[13px] text-muted mt-0.5">
            {units.length} business units &middot; {stats.active} active
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
              placeholder="Search business units…"
              className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
            />
          </div>
          <button
            type="button"
            onClick={() => setFormOpen(true)}
            className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-glow-primary cursor-pointer whitespace-nowrap"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Business Unit
          </button>
        </div>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Business Unit">
        <CreateBusinessUnitForm />
      </Modal>

      {/* Mobile: always-visible create form (unchanged) */}
      <div className="md:hidden">
        <CreateBusinessUnitForm />
      </div>

      {/* Desktop stat strip */}
      <div className="hidden md:flex md:gap-2.5">
        <StatChip label="Total units" value={units.length} />
        <StatChip label="Active" value={stats.active} dotColor="#28A745" />
        <StatChip label="Inactive" value={stats.inactive} dotColor="#D0021B" />
        <StatChip label="Portal enabled" value={stats.portalEnabled} dotColor="#2B8DB8" />
      </div>

      {/* Mobile card grid: unfiltered, unchanged */}
      <div className="flex flex-col gap-2.5 md:hidden">
        {units.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3 text-xs text-muted">
            No business units yet — add one above.
          </div>
        ) : (
          units.map((bu) => <UnitCard key={bu.id} unit={bu} />)
        )}
      </div>

      {/* Desktop card grid: filtered by search */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-2.5 md:items-start">
        {filtered.length === 0 ? (
          <div className="md:col-span-full bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3 text-xs text-muted">
            {units.length === 0 ? "No business units yet — add one above." : "No business units match your search."}
          </div>
        ) : (
          filtered.map((bu) => <UnitCard key={bu.id} unit={bu} />)
        )}
      </div>
    </div>
  );
}

function UnitCard({ unit }: { unit: BusinessUnitRow }) {
  return (
    <div className="flex flex-col gap-2.5 bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3 text-xs">
      <div className="flex items-center justify-between gap-2">
        <span className={unit.active ? "font-medium text-text" : "font-medium text-muted line-through"}>{unit.name}</span>
        <form action={setBusinessUnitActiveAction.bind(null, unit.id, !unit.active)}>
          <button type="submit" className={`text-[11px] font-semibold cursor-pointer whitespace-nowrap ${unit.active ? "text-danger" : "text-success-dark"}`}>
            {unit.active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>
      <div className="flex justify-end">
        <BusinessUnitPortalRow buId={unit.id} buName={unit.name} portalUrl={unit.portalUrl} />
      </div>
    </div>
  );
}
