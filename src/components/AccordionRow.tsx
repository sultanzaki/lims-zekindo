"use client";

import { useState } from "react";
import Link from "next/link";
import Chevron from "@/components/ui/Chevron";

// Accordion row used by the Lab Management hub for grouped entries (e.g.
// Reagents & Chemicals → Lab Inventory / Plant Stock). On mobile, a long
// flat list of "Parent — Child" rows wraps awkwardly; collapsing the
// children under one expandable parent keeps the hub scannable. Desktop
// gets the same treatment for consistency.
export default function AccordionRow({
  label,
  defaultOpen = false,
  items,
  last = false,
}: {
  label: string;
  defaultOpen?: boolean;
  items: { label: string; href: string }[];
  last?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={last ? "" : "border-b border-border-soft"}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3.5 min-h-[52px] cursor-pointer hover:bg-chip-bg transition-colors text-left"
      >
        <span className="text-sm font-medium text-text">{label}</span>
        <span className={`transition-transform duration-150 ${open ? "rotate-90" : ""}`}>
          <Chevron />
        </span>
      </button>
      {open && (
        <div className="pb-2">
          {items.map((item) => (
            <Link key={item.href} href={item.href}>
              <div className="flex items-center justify-between pl-6 pr-4 py-3 min-h-[44px] ml-3 border-l border-border-soft">
                <span className="text-[13px] font-medium text-text">{item.label}</span>
                <Chevron />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
