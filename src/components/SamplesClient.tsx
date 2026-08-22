"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import BottomNav from "@/components/BottomNav";
import { SAMPLE_STATUSES } from "@/lib/status";

type SampleRow = {
  id: string;
  type: string;
  source: string;
  status: string;
};

const STATUS_OPTIONS = ["All", ...SAMPLE_STATUSES];

export default function SamplesClient({
  samples,
  hasUnread,
}: {
  samples: SampleRow[];
  hasUnread: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return samples.filter((s) => {
      if (statusFilter !== "All" && s.status !== statusFilter) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q)
      );
    });
  }, [samples, query, statusFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="sticky top-0 bg-white border-b border-border px-5 pt-6 pb-3 z-10 flex flex-col gap-3">
        <div className="text-xl font-bold text-text">Samples</div>
        <div className="flex items-center gap-2 bg-chip-bg rounded-full px-3.5 py-2.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#888888" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, type, source…"
            className="border-none bg-transparent text-[13px] text-text flex-1 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {STATUS_OPTIONS.map((opt) => {
            const active = statusFilter === opt;
            return (
              <button
                key={opt}
                onClick={() => setStatusFilter(opt)}
                className="text-xs font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0 cursor-pointer"
                style={{
                  background: active ? "#2B8DB8" : "#F0F4F8",
                  color: active ? "#ffffff" : "#444444",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 px-5 pt-3.5 pb-5 flex flex-col gap-2.5">
        {filtered.map((s) => (
          <Link
            key={s.id}
            href={`/samples/${s.id}`}
            className="flex items-center gap-2.5 bg-white border border-border rounded-xl p-3.5"
          >
            <div className="flex-1">
              <div className="text-sm font-semibold text-text">{s.id}</div>
              <div className="text-xs text-muted mt-0.5">
                {s.type} · {s.source}
              </div>
            </div>
            <StatusBadge status={s.status} />
            <svg width="8" height="14" viewBox="0 0 8 14" className="shrink-0">
              <path d="M1 1l6 6-6 6" stroke="#C8D6DF" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-10 px-5 text-muted text-[13px]">No samples match your search.</div>
        )}
      </div>

      <BottomNav active="samples" hasUnread={hasUnread} />
    </div>
  );
}
