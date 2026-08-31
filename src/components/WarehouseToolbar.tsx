"use client";

import { useState } from "react";
import { CreateStorageLocationForm } from "@/components/WarehouseForms";
import StatChip from "@/components/ui/StatChip";
import Modal from "@/components/ui/Modal";

export default function WarehouseToolbar({
  totalLocations,
  activeLocations,
  totalItems,
  parentOptions,
}: {
  totalLocations: number;
  activeLocations: number;
  totalItems: number;
  parentOptions: { id: string; label: string }[];
}) {
  const [formOpen, setFormOpen] = useState(false);

  return (
    <>
      <p className="text-xs text-muted -mt-1 md:hidden">
        Physical storage locations shared by Reagents &amp; Chemicals and Equipment — nest them as deep as your lab is
        organized, e.g. KBI › Microbiology Lab › Rak X.
      </p>

      {/* Desktop header + toolbar */}
      <div className="hidden md:flex md:items-start md:justify-between md:gap-6 md:pr-10">
        <div>
          <div className="text-[20px] font-bold text-text tracking-tight">Warehouse</div>
          <div className="text-[13px] text-muted mt-0.5">
            {totalLocations} locations &middot; {totalItems} items stored
          </div>
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
          Add Location
        </button>
      </div>

      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Add Location">
        <CreateStorageLocationForm parentOptions={parentOptions} />
      </Modal>

      {/* Mobile: always-visible create form (unchanged) */}
      <div className="md:hidden">
        <CreateStorageLocationForm parentOptions={parentOptions} />
      </div>

      {/* Desktop stat strip */}
      <div className="hidden md:flex md:gap-2.5">
        <StatChip label="Total locations" value={totalLocations} />
        <StatChip label="Active" value={activeLocations} dotColor="#28A745" />
        <StatChip label="Inactive" value={totalLocations - activeLocations} dotColor="#D0021B" />
        <StatChip label="Items stored" value={totalItems} />
      </div>
    </>
  );
}
