"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusBadge from "@/components/StatusBadge";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import MobileTopBar from "@/components/MobileTopBar";
import Chevron from "@/components/ui/Chevron";
import EmptyState from "@/components/ui/EmptyState";
import { SAMPLE_STATUSES } from "@/lib/status";

type SampleRow = {
  id: string;
  type: string;
  source: string;
  status: string;
  collectedBy: string;
  receivedDate: Date;
};

const STATUS_OPTIONS = ["All", ...SAMPLE_STATUSES];

// Neutralize leading =, +, -, @ (and tab/CR) so a value typed into a free-text
// field (Source, Collected By…) can't be interpreted as a formula by Excel/
// Sheets when the exported file is opened later (CSV/formula injection).
function csvSafe(v: string) {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

function toCsv(rows: SampleRow[]) {
  const header = ["Sample ID", "Type", "Source", "Status", "Collected By", "Received"];
  const lines = rows.map((s) =>
    [s.id, s.type, s.source, s.status, s.collectedBy, s.receivedDate.toISOString()]
      .map((v) => `"${csvSafe(String(v)).replace(/"/g, '""')}"`)
      .join(",")
  );
  return [header.join(","), ...lines].join("\n");
}

function downloadCsv(rows: SampleRow[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `samples-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SamplesClient({
  samples,
  hasUnread,
  role,
  userName,
}: {
  samples: SampleRow[];
  hasUnread: boolean;
  role: string;
  userName: string;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom + "T00:00:00") : null;
    const to = dateTo ? new Date(dateTo + "T23:59:59") : null;
    return samples.filter((s) => {
      if (statusFilter !== "All" && s.status !== statusFilter) return false;
      if (from && s.receivedDate < from) return false;
      if (to && s.receivedDate > to) return false;
      if (!q) return true;
      return (
        s.id.toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        s.collectedBy.toLowerCase().includes(q)
      );
    });
  }, [samples, query, statusFilter, dateFrom, dateTo]);

  const hasDateFilter = dateFrom || dateTo;

  return (
    <div className="h-dvh flex flex-col overflow-y-auto overscroll-contain bg-white">
      <TopNav active="samples" hasUnread={hasUnread} role={role} userName={userName} />
      <MobileTopBar hasUnread={hasUnread} />
      <div className="sticky top-0 md:top-16 bg-white border-b border-border px-5 pt-6 pb-3.5 z-10 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-[19px] font-bold text-text tracking-tight">Samples</h1>
          <button
            onClick={() => downloadCsv(filtered)}
            className="text-xs font-semibold text-primary cursor-pointer"
          >
            Export CSV
          </button>
        </div>
        <div className="flex items-center gap-2 bg-chip-bg border border-border rounded-[8px] px-3.5 py-2.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, type, source, collector…"
            className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint"
          />
        </div>
        <div className="relative -mx-5">
          <div className="flex gap-2 overflow-x-auto pb-0.5 px-5">
            {STATUS_OPTIONS.map((opt) => {
              const active = statusFilter === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setStatusFilter(opt)}
                  className="text-xs font-semibold px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0 cursor-pointer"
                  style={{
                    background: active ? "#2B8DB8" : "#EFF2F5",
                    color: active ? "#ffffff" : "#3D4653",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute top-0 right-0 bottom-0.5 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="text-xs font-semibold text-primary self-start cursor-pointer"
        >
          {showFilters ? "Hide date filter" : "Filter by received date"}
          {hasDateFilter && !showFilters && " •"}
        </button>
        {showFilters && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 text-xs px-2.5 py-2 border border-border rounded-[8px] text-text bg-white"
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 text-xs px-2.5 py-2 border border-border rounded-[8px] text-text bg-white"
            />
          </div>
        )}
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
            <Chevron />
          </Link>
        ))}
        {filtered.length === 0 && <EmptyState>No samples match your search.</EmptyState>}
      </div>

      <BottomNav active="samples" hasUnread={hasUnread} />
    </div>
  );
}
