"use client";

import { useState } from "react";
import WarehouseHierarchyGraph, { type WarehouseGraphNode } from "@/components/WarehouseHierarchyGraph";

type View = "list" | "graph";

export default function WarehouseViewSwitch({ nodes, children }: { nodes: WarehouseGraphNode[]; children: React.ReactNode }) {
  const [view, setView] = useState<View>("list");

  return (
    <div className="flex flex-col gap-3">
      <div className="relative inline-flex self-start bg-chip-bg rounded-full p-1">
        <div
          className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-card-sm transition-transform duration-200 ease-out"
          style={{ transform: view === "graph" ? "translateX(100%)" : "translateX(0%)" }}
        />
        {/* Fixed, equal width on both buttons — the sliding indicator above
            is a straight 50% split, which only lines up with each button's
            actual bounds when "List" and "Hierarchy" (very different label
            lengths) are forced to the same width. Without this the indicator
            undershoots the longer label and its text pokes out past the pill. */}
        <button
          type="button"
          onClick={() => setView("list")}
          className={`relative z-10 w-[92px] text-center text-xs font-semibold px-4 py-2 rounded-full transition-colors ${view === "list" ? "text-text" : "text-muted"}`}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setView("graph")}
          className={`relative z-10 w-[92px] text-center text-xs font-semibold px-4 py-2 rounded-full transition-colors ${view === "graph" ? "text-text" : "text-muted"}`}
        >
          Hierarchy
        </button>
      </div>

      <div key={view} className="pop-in">
        {view === "list" ? children : <WarehouseHierarchyGraph nodes={nodes} />}
      </div>
    </div>
  );
}
