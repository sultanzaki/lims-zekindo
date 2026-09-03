"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import EmptyState from "@/components/ui/EmptyState";

export type WarehouseSection = { id: string; name: string; active: boolean; itemCount: number };
export type WarehouseRack = { id: string; name: string; active: boolean; sections: WarehouseSection[] };

// Tuned by eye for a believable "looking down an aisle" angle without
// tipping so far the shelf labels foreshorten into unreadability.
const TILT_DEG = 48;
const RADIUS = 280;
const PANEL_W = 108;
const SECTION_H = 34;

function heatColor(count: number, max: number, active: boolean) {
  if (!active) return "rgba(122,139,148,0.35)";
  if (count <= 0) return "rgba(43,141,184,0.12)";
  const t = Math.min(1, count / max);
  return `rgba(43,141,184,${(0.22 + t * 0.58).toFixed(2)})`;
}

export default function WarehouseMap3D({ racks }: { racks: WarehouseRack[] }) {
  const router = useRouter();
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startAngle: number } | null>(null);

  useEffect(() => {
    if (racks.length < 2) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    // One-time "you can spin this" hint — a small settle-in wiggle, then it
    // hands full control back to the drag gesture.
    const t1 = setTimeout(() => setAngle(16), 300);
    const t2 = setTimeout(() => setAngle(-14), 900);
    const t3 = setTimeout(() => setAngle(0), 1500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [racks.length]);

  if (racks.length === 0) {
    return <EmptyState>No warehouse locations yet — add one above.</EmptyState>;
  }

  const maxCount = Math.max(1, ...racks.flatMap((r) => r.sections.map((s) => s.itemCount)));
  const angleStep = racks.length > 1 ? Math.min(46, 210 / racks.length) : 0;

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startAngle: angle };
    setDragging(true);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragRef.current) return;
    const delta = (e.clientX - dragRef.current.startX) * 0.5;
    setAngle(dragRef.current.startAngle + delta);
  }
  function endDrag() {
    dragRef.current = null;
    setDragging(false);
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-full flex items-center justify-center py-12 rounded-[20px] bg-scanner-bg overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing"
        style={{ perspective: "1500px", minHeight: 300 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div style={{ transformStyle: "preserve-3d", transform: `rotateX(${TILT_DEG}deg)` }}>
          <div
            style={{
              position: "relative",
              transformStyle: "preserve-3d",
              transform: `rotateY(${angle}deg)`,
              transition: dragging ? "none" : "transform 500ms cubic-bezier(0.22, 0.8, 0.28, 1)",
            }}
          >
            {racks.map((rack, i) => (
              <RackPanel
                key={rack.id}
                rack={rack}
                index={i}
                count={racks.length}
                angleStep={angleStep}
                maxCount={maxCount}
                onOpen={(id) => router.push(`/inventory/warehouse/${id}`)}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="text-[11px] text-muted">Drag left/right to spin the warehouse around. Tap a shelf to open it.</div>
    </div>
  );
}

function RackPanel({
  rack,
  index,
  count,
  angleStep,
  maxCount,
  onOpen,
}: {
  rack: WarehouseRack;
  index: number;
  count: number;
  angleStep: number;
  maxCount: number;
  onOpen: (id: string) => void;
}) {
  const angle = (index - (count - 1) / 2) * angleStep;
  const rad = (angle * Math.PI) / 180;
  const x = RADIUS * Math.sin(rad);
  // Racks off-center recede slightly (cos < 1), bowing the row into a
  // shallow arc instead of a flat wall — reads more like a real aisle.
  const z = RADIUS * (Math.cos(rad) - 1);
  const height = rack.sections.length * SECTION_H + 14;

  return (
    <div
      style={{
        position: "absolute",
        left: -PANEL_W / 2,
        top: -height,
        width: PANEL_W,
        transformStyle: "preserve-3d",
        transform: `translate3d(${x}px, 0px, ${z}px) rotateY(${angle}deg)`,
      }}
    >
      {/* Faked thickness: a darker plate sitting just behind the face so the
          panel reads as a shelf unit, not a paper-thin card. */}
      <div className="absolute inset-0 rounded-[8px] bg-[#0a141a]" style={{ transform: "translateZ(-7px) scale(0.97)" }} />
      <div
        className={`relative rounded-[8px] overflow-hidden border border-white/10 shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${
          rack.active ? "" : "opacity-60"
        }`}
      >
        <div className="px-2.5 py-1.5 bg-[#0f1c24] text-[10px] font-semibold text-[#B4C6CF] truncate">{rack.name}</div>
        {rack.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onOpen(s.id)}
            style={{ height: SECTION_H, background: heatColor(s.itemCount, maxCount, s.active) }}
            className="w-full flex flex-col justify-center px-2.5 border-t border-black/25 text-left cursor-pointer active:brightness-90 transition-[filter]"
          >
            <span className="text-[10px] font-semibold text-white truncate">{s.name}</span>
            <span className="text-[9px] text-white/75">
              {s.itemCount} item{s.itemCount === 1 ? "" : "s"}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
