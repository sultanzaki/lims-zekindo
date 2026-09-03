"use client";

import { useState } from "react";
import WarehouseMap3D, { type WarehouseRack } from "@/components/WarehouseMap3D";

type View = "list" | "3d";

export default function WarehouseViewSwitch({ racks, children }: { racks: WarehouseRack[]; children: React.ReactNode }) {
  const [view, setView] = useState<View>("list");

  return (
    <div className="flex flex-col gap-3">
      <div className="relative inline-flex self-start bg-chip-bg rounded-full p-1">
        <div
          className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-card-sm transition-transform duration-200 ease-out"
          style={{ transform: view === "3d" ? "translateX(100%)" : "translateX(0%)" }}
        />
        <button
          type="button"
          onClick={() => setView("list")}
          className={`relative z-10 text-xs font-semibold px-4 py-2 rounded-full transition-colors ${view === "list" ? "text-text" : "text-muted"}`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setView("3d")}
          className={`relative z-10 text-xs font-semibold px-4 py-2 rounded-full transition-colors ${view === "3d" ? "text-text" : "text-muted"}`}
        >
          3D Map
        </button>
      </div>

      <div key={view} className="pop-in">
        {view === "list" ? children : <WarehouseMap3D racks={racks} />}
      </div>
    </div>
  );
}
