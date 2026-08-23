"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDateTime, dayGroupLabel } from "@/lib/format";
import { auditActionInfo, AUDIT_CATEGORY_STYLE, type AuditCategory } from "@/lib/audit-labels";
import EmptyState from "@/components/ui/EmptyState";

type Entry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  detail: string | null;
  createdAt: Date;
  actorName: string;
};

const CATEGORY_OPTIONS: ("All" | AuditCategory)[] = ["All", "create", "approve", "reject", "update", "remove", "security"];
const DAY_GROUP_ORDER = ["Today", "Yesterday", "Earlier"] as const;

function CategoryIcon({ category, color }: { category: AuditCategory; color: string }) {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  switch (category) {
    case "create":
      return <svg {...common}><path d="M12 8v8M8 12h8" /></svg>;
    case "approve":
      return <svg {...common}><path d="M5 13l4 4L19 7" /></svg>;
    case "reject":
      return <svg {...common}><path d="M6 6l12 12M18 6L6 18" /></svg>;
    case "update":
      return <svg {...common}><path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>;
    case "remove":
      return <svg {...common}><path d="M3 6h18" /><path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" /></svg>;
    case "security":
      return <svg {...common}><rect x="4" y="11" width="16" height="9" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" /></svg>;
  }
}

function csvSafe(v: string) {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

function toCsv(rows: Entry[]) {
  const header = ["Timestamp", "Actor", "Action", "Entity Type", "Entity ID", "Detail"];
  const lines = rows.map((e) => {
    const { label } = auditActionInfo(e.action);
    return [e.createdAt.toISOString(), e.actorName, label, e.entityType, e.entityLabel ?? e.entityId, e.detail ?? ""]
      .map((v) => `"${csvSafe(String(v)).replace(/"/g, '""')}"`)
      .join(",");
  });
  return [header.join(","), ...lines].join("\n");
}

function downloadCsv(rows: Entry[]) {
  const csv = toCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `audit-log-export-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AuditLogClient({ entries }: { entries: Entry[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<"All" | AuditCategory>("All");

  const enriched = useMemo(
    () => entries.map((e) => ({ ...e, ...auditActionInfo(e.action) })),
    [entries]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return enriched.filter((e) => {
      if (category !== "All" && e.category !== category) return false;
      if (!q) return true;
      return (
        e.actorName.toLowerCase().includes(q) ||
        e.label.toLowerCase().includes(q) ||
        e.entityType.toLowerCase().includes(q) ||
        e.entityId.toLowerCase().includes(q) ||
        (e.entityLabel ?? "").toLowerCase().includes(q) ||
        (e.detail ?? "").toLowerCase().includes(q)
      );
    });
  }, [enriched, query, category]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: enriched.length };
    for (const e of enriched) counts[e.category] = (counts[e.category] ?? 0) + 1;
    return counts;
  }, [enriched]);

  const groups = useMemo(
    () =>
      DAY_GROUP_ORDER.map((label) => ({
        label,
        items: filtered.filter((e) => dayGroupLabel(e.createdAt) === label),
      })).filter((g) => g.items.length > 0),
    [filtered]
  );

  return (
    <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-[11px] text-muted">Most recent {entries.length} events</div>
        <button onClick={() => downloadCsv(filtered)} className="text-xs font-semibold text-primary cursor-pointer">
          Export CSV
        </button>
      </div>

      <div className="flex items-center gap-2 bg-chip-bg border border-border rounded-[13px] px-3.5 py-2.5">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A8B94" strokeWidth="2" className="shrink-0">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by actor, action, or entity…"
          className="border-none bg-transparent text-[15px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
        />
      </div>

      <div className="relative -mx-5">
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 px-5">
          {CATEGORY_OPTIONS.map((opt) => {
            const active = category === opt;
            const style = opt === "All" ? null : AUDIT_CATEGORY_STYLE[opt];
            return (
              <button
                key={opt}
                onClick={() => setCategory(opt)}
                className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-full whitespace-nowrap shrink-0 cursor-pointer border transition-colors duration-150"
                style={{
                  background: active ? "#1A5F7A" : "#FFFFFF",
                  color: active ? "#ffffff" : "#444444",
                  borderColor: active ? "#1A5F7A" : "#E3EAEF",
                }}
              >
                <span>{opt === "All" ? "All" : style!.label}</span>
                <span className="text-[11px] font-bold opacity-75 font-mono-data">{categoryCounts[opt] ?? 0}</span>
              </button>
            );
          })}
        </div>
        <div className="pointer-events-none absolute top-0 right-0 bottom-0.5 w-8 bg-gradient-to-l from-page-bg to-transparent" />
      </div>

      <div className="flex flex-col">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="pt-3 pb-1.5 flex items-baseline justify-between">
              <span className="text-[11px] font-bold text-muted tracking-[0.08em] uppercase">{group.label}</span>
              <span className="text-[11px] text-faint font-mono-data">{group.items.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {group.items.map((e, i) => {
                const style = AUDIT_CATEGORY_STYLE[e.category];
                return (
                  <div
                    key={e.id}
                    className="stagger-item bg-white border border-border rounded-2xl shadow-card-sm p-3.5"
                    style={{ "--stagger": i } as React.CSSProperties}
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className="w-8 h-8 rounded-[9px] flex items-center justify-center shrink-0 mt-px"
                        style={{ background: style.bg }}
                      >
                        <CategoryIcon category={e.category} color={style.color} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2.5">
                          <span className="text-[13px] font-semibold text-text leading-snug">{e.label}</span>
                          <span className="text-[11px] text-faint whitespace-nowrap shrink-0">{formatDateTime(e.createdAt)}</span>
                        </div>
                        <div className="text-[12px] text-muted mt-0.5">
                          {e.actorName}
                          {" · "}
                          {e.entityType === "Sample" ? (
                            <Link href={`/samples/${e.entityId}`} className="font-mono-data text-primary font-semibold">
                              {e.entityType} {e.entityId}
                            </Link>
                          ) : e.entityLabel ? (
                            <span>{e.entityType} · {e.entityLabel}</span>
                          ) : (
                            <span className="font-mono-data">{e.entityType} {e.entityId}</span>
                          )}
                        </div>
                        {e.detail && <div className="text-[12px] text-faint mt-1 leading-snug">{e.detail}</div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
        {filtered.length === 0 && <EmptyState>No activity matches your search.</EmptyState>}
      </div>
    </div>
  );
}
