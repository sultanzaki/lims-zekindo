"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { clientStageLabel, clientStageColors } from "@/lib/publicStage";

type SampleRow = {
  id: string;
  name: string | null;
  type: string;
  status: string;
  receivedDate: Date;
};

type Bucket = "All" | "Active" | "Completed" | "Attention";

function bucketOf(status: string): Exclude<Bucket, "All"> {
  if (status === "Complete") return "Completed";
  if (status === "Rejected") return "Attention";
  return "Active";
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A8B94" strokeWidth="2" className="shrink-0">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#93A6B0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

export default function PortalSampleList({ token, samples }: { token: string; samples: SampleRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Bucket>("All");

  const counts = useMemo(() => {
    const c = { Active: 0, Completed: 0, Attention: 0 };
    for (const s of samples) c[bucketOf(s.status)]++;
    return c;
  }, [samples]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return samples.filter((s) => {
      if (filter !== "All" && bucketOf(s.status) !== filter) return false;
      if (!q) return true;
      return s.id.toLowerCase().includes(q) || (s.name ?? "").toLowerCase().includes(q) || s.type.toLowerCase().includes(q);
    });
  }, [samples, query, filter]);

  const tiles: { key: Bucket; label: string; count: number; color: string }[] = [
    { key: "Active", label: "In Progress", count: counts.Active, color: "#1A5F7A" },
    { key: "Completed", label: "Completed", count: counts.Completed, color: "#1E7A34" },
    { key: "Attention", label: "Needs Attention", count: counts.Attention, color: "#B00016" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => {
          const active = filter === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(active ? "All" : t.key)}
              className="flex flex-col items-center gap-0.5 rounded-[14px] py-3 px-1.5 border transition-colors cursor-pointer"
              style={{
                background: active ? t.color : "#ffffff",
                borderColor: active ? t.color : "#ECF1F4",
              }}
            >
              <span className="text-lg font-bold font-mono-data" style={{ color: active ? "#ffffff" : t.color }}>
                {t.count}
              </span>
              <span
                className="text-[10px] font-semibold text-center leading-tight"
                style={{ color: active ? "rgba(255,255,255,0.85)" : "#7A8B94" }}
              >
                {t.label}
              </span>
            </button>
          );
        })}
      </div>

      {samples.length > 4 && (
        <div className="flex items-center gap-2 bg-chip-bg border border-border rounded-[13px] px-3.5 py-2.5">
          <SearchIcon />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID or name…"
            className="border-none bg-transparent text-[14px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl shadow-card-sm p-6 text-[13px] text-muted text-center">
          {samples.length === 0 ? "No samples have been logged for this business unit yet." : "No samples match your search."}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filtered.map((s) => {
            const badge = clientStageColors(s.status);
            return (
              <Link
                key={s.id}
                href={`/portal/${token}/samples/${s.id}`}
                className="bg-white border border-border rounded-[16px] shadow-card-sm p-4 flex items-center justify-between gap-3 transition-colors active:bg-page-bg"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-muted font-mono-data tracking-tight">{s.id}</div>
                  <div className="text-sm font-bold text-text mt-0.5 truncate">{s.name || s.type}</div>
                  <div className="text-[11px] text-faint mt-0.5">Received {formatDate(s.receivedDate)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {clientStageLabel(s.status)}
                  </span>
                  <ChevronRightIcon />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
