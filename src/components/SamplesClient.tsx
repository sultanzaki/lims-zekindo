"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import Chevron from "@/components/ui/Chevron";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import CursorPager from "@/components/ui/CursorPager";
import { inputClassSm } from "@/components/ui/Field";
import { SAMPLE_STATUSES, STATUS_STYLES, CUSTODY_DOT_COLOR, SAMPLE_STATUS_SHORT, type SampleStatus } from "@/lib/status";
import { dueLabelFor, dayGroupLabel, formatDate } from "@/lib/format";
import { canReviewAsSupervisor, canApproveAsQa } from "@/lib/roles";
import { bulkApproveSamplesAction, type BulkApproveResult } from "@/lib/actions/samples";
import type { CursorPageInfo } from "@/lib/pagination";

type SampleRow = {
  id: string;
  name: string | null;
  type: string;
  source: string;
  status: string;
  collectedBy: string;
  receivedDate: Date;
  approvedAt: Date | null;
  sampleType: { targetTatHours: number } | null;
};

const STATUS_OPTIONS = ["All", ...SAMPLE_STATUSES];
const DAY_GROUP_ORDER = ["Today", "Yesterday", "Earlier"] as const;
const SEARCH_DEBOUNCE_MS = 400;

// Neutralize leading =, +, -, @ (and tab/CR) so a value typed into a free-text
// field (Source, Collected By…) can't be interpreted as a formula by Excel/
// Sheets when the exported file is opened later (CSV/formula injection).
function csvSafe(v: string) {
  return /^[=+\-@\t\r]/.test(v) ? `'${v}` : v;
}

function toCsv(rows: SampleRow[]) {
  const header = ["Sample ID", "Name", "Type", "Source", "Status", "Collected By", "Received"];
  const lines = rows.map((s) =>
    [s.id, s.name ?? "", s.type, s.source, s.status, s.collectedBy, s.receivedDate.toISOString()]
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
  unreadCount,
  role,
  userName,
  initialStatus = "All",
  initialQuery = "",
  initialDateFrom = "",
  initialDateTo = "",
  statusCounts,
  pageInfo,
}: {
  samples: SampleRow[];
  unreadCount: number;
  role: string;
  userName: string;
  initialStatus?: string;
  initialQuery?: string;
  initialDateFrom?: string;
  initialDateTo?: string;
  statusCounts: Record<string, number>;
  pageInfo: CursorPageInfo;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [query, setQuery] = useState(initialQuery);
  const [status, setStatus] = useState(initialStatus);
  const [showFilters, setShowFilters] = useState(Boolean(initialDateFrom || initialDateTo));
  const [dateFrom, setDateFrom] = useState(initialDateFrom);
  const [dateTo, setDateTo] = useState(initialDateTo);

  // Keep local input state aligned after a server round-trip (e.g. the
  // browser's back/forward button lands on a different set of params).
  // Adjusted during render (React's documented pattern for resetting state
  // when a prop changes) rather than in an effect, to avoid an extra
  // commit/cascading re-render.
  const [syncedQuery, setSyncedQuery] = useState(initialQuery);
  const [syncedStatus, setSyncedStatus] = useState(initialStatus);
  const [syncedDateFrom, setSyncedDateFrom] = useState(initialDateFrom);
  const [syncedDateTo, setSyncedDateTo] = useState(initialDateTo);
  if (initialQuery !== syncedQuery) {
    setSyncedQuery(initialQuery);
    setQuery(initialQuery);
  }
  if (initialStatus !== syncedStatus) {
    setSyncedStatus(initialStatus);
    setStatus(initialStatus);
  }
  if (initialDateFrom !== syncedDateFrom) {
    setSyncedDateFrom(initialDateFrom);
    setDateFrom(initialDateFrom);
  }
  if (initialDateTo !== syncedDateTo) {
    setSyncedDateTo(initialDateTo);
    setDateTo(initialDateTo);
  }

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [approvePassword, setApprovePassword] = useState("");
  const [approveError, setApproveError] = useState("");
  const [approveResult, setApproveResult] = useState<BulkApproveResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Every filter change is a real server-side query now (search/status/date
  // all run in the WHERE clause, not client-side), so it always resets
  // pagination back to the first page — otherwise "after"/"before" from the
  // old, unfiltered position would carry over and paginate the wrong set.
  function updateParams(patch: Record<string, string | undefined>) {
    const sp = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) sp.set(key, value);
      else sp.delete(key);
    }
    sp.delete("after");
    sp.delete("before");
    const qs = sp.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }

  // Debounced so typing doesn't fire a server round-trip per keystroke.
  useEffect(() => {
    if (query === initialQuery) return;
    const handle = setTimeout(() => updateParams({ q: query || undefined }), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function setStatusFilter(status: string) {
    updateParams({ status: status === "All" ? undefined : status });
  }

  function applyDateFilter(from: string, to: string) {
    updateParams({ from: from || undefined, to: to || undefined });
  }

  const isApprovable = (s: SampleRow) =>
    (s.status === "Awaiting Supervisor Review" && canReviewAsSupervisor(role)) ||
    (s.status === "Awaiting QA Approval" && canApproveAsQa(role));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
    setApproveResult(null);
    setApproveError("");
    setApprovePassword("");
  }

  async function submitBulkApprove() {
    setApproveError("");
    if (!approvePassword) {
      setApproveError("Enter your password to sign this action.");
      return;
    }
    setApproving(true);
    const result = await bulkApproveSamplesAction(Array.from(selectedIds), approvePassword);
    setApproving(false);
    if ("error" in result) {
      setApproveError(result.error);
      return;
    }
    setApproveResult(result);
    setApprovePassword("");
    setShowConfirm(false);
    router.refresh();
  }

  const hasDateFilter = Boolean(dateFrom || dateTo);
  const hasStatusFilter = status !== "All";

  // When a status filter is active, date-based grouping is confusing (the
  // list was filtered by status, not by day) — fall back to a single flat
  // group so the pills and the rows tell the same story.
  const groups = useMemo(() => {
    if (hasStatusFilter) {
      return [{ label: "All results", items: samples }];
    }
    return DAY_GROUP_ORDER.map((label) => ({
      label,
      items: samples.filter((s) => dayGroupLabel(s.receivedDate) === label),
    })).filter((g) => g.items.length > 0);
  }, [samples, hasStatusFilter]);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={role} userName={userName} unreadCount={unreadCount} />
      <div className="sticky top-0 bg-white border-b border-border-soft px-5 md:px-9 pt-6 md:pt-7 pb-2.5 md:pb-4 z-10">
      {/* ============ Desktop header + toolbar ============ */}
      <div className="hidden md:flex md:flex-col md:gap-3 md:max-w-[1400px] md:w-full md:pr-10">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0 shrink-0">
            <div className="text-[20px] font-bold text-text tracking-tight">Samples</div>
            <div className="text-[13px] text-muted mt-0.5 whitespace-nowrap">
              {statusCounts.All} samples &middot; {statusCounts["In Testing"] ?? 0} in testing
            </div>
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-2 h-[38px] px-3 rounded-[10px] bg-white border border-border w-[170px] shrink">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#93A6B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
              />
            </div>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setStatusFilter(e.target.value);
              }}
              className="h-[38px] px-2.5 rounded-[10px] bg-white border border-border text-[13px] font-semibold text-[#5B6B74] cursor-pointer shrink-0 max-w-[130px]"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt} ({statusCounts[opt] ?? 0})
                </option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters((v) => !v)}
              aria-label="Filter by received date"
              title="Filter by received date"
              className={`flex items-center justify-center w-[38px] h-[38px] rounded-[10px] border cursor-pointer shrink-0 ${
                showFilters || hasDateFilter ? "bg-primary-soft border-primary/30 text-primary-dark" : "bg-white border-border text-[#5B6B74]"
              }`}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="16" rx="2" />
                <path d="M8 3v4" />
                <path d="M16 3v4" />
                <path d="M3 10h18" />
              </svg>
            </button>
            <button
              onClick={() => downloadCsv(samples)}
              aria-label="Export CSV"
              title="Export CSV (current page)"
              className="flex items-center justify-center w-[38px] h-[38px] rounded-[10px] bg-white border border-border text-primary-dark cursor-pointer shrink-0"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              className="h-[38px] px-3 rounded-[10px] border border-border bg-white text-[13px] font-semibold text-text cursor-pointer whitespace-nowrap shrink-0"
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
            {!selectMode && (
              <Link
                href="/samples/new"
                className="flex items-center gap-1.5 h-[38px] px-3.5 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-glow-primary whitespace-nowrap shrink-0"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New
              </Link>
            )}
          </div>
        </div>
        {showFilters && (
          <div className="flex items-center gap-2 self-end">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                applyDateFilter(e.target.value, dateTo);
              }}
              className="text-xs px-2.5 py-2 border border-border rounded-[10px] text-text bg-white"
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                applyDateFilter(dateFrom, e.target.value);
              }}
              className="text-xs px-2.5 py-2 border border-border rounded-[10px] text-text bg-white"
            />
          </div>
        )}
        {approveResult && "approved" in approveResult && (
          <div className="bg-primary-soft border border-primary/30 rounded-[13px] px-3.5 py-2.5 text-xs text-primary-dark flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold">{approveResult.approved} approved.</span>
              {approveResult.skipped.length > 0 && (
                <span> {approveResult.skipped.length} skipped — {approveResult.skipped.map((s) => `${s.id} (${s.reason})`).join(", ")}.</span>
              )}
            </div>
            <button type="button" onClick={() => setApproveResult(null)} className="shrink-0 font-semibold cursor-pointer">
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* ============ Mobile header (unchanged) ============ */}
      <div className="md:hidden flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-[19px] font-bold text-text tracking-tight">Samples</h1>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
              className="inline-flex items-center gap-1.5 border border-border bg-white rounded-full px-3.5 py-2 text-[13px] font-semibold text-text cursor-pointer"
            >
              {selectMode ? "Cancel" : "Select"}
            </button>
            {!selectMode && (
              <Link
                href="/samples/new"
                className="inline-flex items-center gap-1.5 bg-primary text-white rounded-full px-3.5 py-2 text-[13px] font-semibold shrink-0"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                New
              </Link>
            )}
          </div>
        </div>
        {approveResult && "approved" in approveResult && (
          <div className="bg-primary-soft border border-primary/30 rounded-[13px] px-3.5 py-2.5 text-xs text-primary-dark flex items-start justify-between gap-2">
            <div>
              <span className="font-semibold">{approveResult.approved} approved.</span>
              {approveResult.skipped.length > 0 && (
                <span> {approveResult.skipped.length} skipped — {approveResult.skipped.map((s) => `${s.id} (${s.reason})`).join(", ")}.</span>
              )}
            </div>
            <button type="button" onClick={() => setApproveResult(null)} className="shrink-0 font-semibold cursor-pointer">
              Dismiss
            </button>
          </div>
        )}
        <div className="flex items-center gap-2 bg-chip-bg border border-border rounded-[13px] px-3.5 py-2.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A8B94" strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by ID, name, type, source…"
            className="border-none bg-transparent text-[15px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
          />
        </div>
        <div className="relative -mx-5">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 px-5">
            {STATUS_OPTIONS.map((opt) => {
              const active = status === opt;
              return (
                <button
                  key={opt}
                  onClick={() => {
                    setStatus(opt);
                    setStatusFilter(opt);
                  }}
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold px-3.5 py-2 rounded-full whitespace-nowrap shrink-0 cursor-pointer border transition-colors duration-150"
                  style={{
                    background: active ? "#1A5F7A" : "#FFFFFF",
                    color: active ? "#ffffff" : "#444444",
                    borderColor: active ? "#1A5F7A" : "#E3EAEF",
                  }}
                >
                  <span>{opt}</span>
                  <span className="text-[11px] font-bold opacity-75 font-mono-data">{statusCounts[opt] ?? 0}</span>
                </button>
              );
            })}
          </div>
          <div className="pointer-events-none absolute top-0 right-0 bottom-0.5 w-8 bg-gradient-to-l from-white to-transparent" />
        </div>
        <div className="flex items-center justify-between pb-0.5">
          <button
            onClick={() => setShowFilters((v) => !v)}
            className="text-xs font-semibold text-primary cursor-pointer"
          >
            {showFilters ? "Hide date filter" : "Filter by received date"}
            {hasDateFilter && !showFilters && " •"}
          </button>
          <button
            onClick={() => downloadCsv(samples)}
            className="text-xs font-semibold text-primary cursor-pointer"
          >
            Export CSV
          </button>
        </div>
        {showFilters && (
          <div className="flex items-center gap-2 pb-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                applyDateFilter(e.target.value, dateTo);
              }}
              className="flex-1 text-xs px-2.5 py-2 border border-border rounded-[10px] text-text bg-white"
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                applyDateFilter(dateFrom, e.target.value);
              }}
              className="flex-1 text-xs px-2.5 py-2 border border-border rounded-[10px] text-text bg-white"
            />
          </div>
        )}
      </div>
      </div>

      <div className="flex-1 pb-5 pb-bottom-nav flex flex-col md:px-9">
      <div className="md:max-w-[1400px] md:w-full">
        <div className="md:hidden">
        {groups.map((group) => (
          <div key={group.label}>
            <div className="px-5 pt-3.5 pb-1.5 flex items-baseline justify-between">
              <span className="text-[11px] font-bold text-muted tracking-[0.08em] uppercase">{group.label}</span>
              <span className="text-[11px] text-faint font-mono-data">{group.items.length}</span>
            </div>
            <div className="px-5 flex flex-col gap-2.5">
              {group.items.map((s, i) => {
                const statusStyle = STATUS_STYLES[s.status as SampleStatus];
                const terminal = s.status === "Complete" || s.status === "Rejected";
                const due = !terminal ? dueLabelFor(s.receivedDate, s.sampleType?.targetTatHours ?? 48) : null;
                const footerLabel = terminal
                  ? s.status === "Complete"
                    ? s.approvedAt
                      ? `Completed ${formatDate(s.approvedAt)}`
                      : "Complete"
                    : "Needs correction"
                  : due!.label;
                const footerColor = terminal
                  ? s.status === "Complete"
                    ? "#1E7A34"
                    : "#B00016"
                  : due!.color;

                const selected = selectedIds.has(s.id);
                return (
                  <Link
                    key={s.id}
                    href={`/samples/${s.id}`}
                    onClick={(e) => {
                      if (!selectMode) return;
                      e.preventDefault();
                      toggleSelect(s.id);
                    }}
                    className="stagger-item bg-white border rounded-[18px] shadow-card px-4 pt-3.5 pb-3"
                    style={{ "--stagger": i, borderColor: selected ? "var(--color-primary)" : undefined } as React.CSSProperties}
                  >
                    <div className="flex items-center justify-between gap-2.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {selectMode && (
                          <span
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                            style={{
                              borderColor: selected ? "var(--color-primary)" : "var(--color-border)",
                              background: selected ? "var(--color-primary)" : "transparent",
                            }}
                          >
                            {selected && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                        )}
                        <div
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: CUSTODY_DOT_COLOR[s.status as SampleStatus] }}
                        />
                        <span className="text-xs font-semibold text-muted font-mono-data truncate">{s.id}</span>
                        {selectMode && isApprovable(s) && (
                          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-success/15 text-success-dark shrink-0">
                            Approvable
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                        style={{ background: statusStyle.bg, color: statusStyle.color }}
                      >
                        {SAMPLE_STATUS_SHORT[s.status as SampleStatus]}
                      </span>
                    </div>
                    <div className="text-base font-semibold text-text mt-2 leading-tight tracking-tight truncate">
                      {s.name || s.type}
                    </div>
                    <div className="text-[13px] text-muted mt-0.5 truncate">
                      {s.name ? `${s.type} · ${s.source}` : s.source}
                    </div>
                    <div className="flex items-center justify-between gap-2.5 mt-3 pt-2.5 border-t border-border-soft">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={footerColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <circle cx="12" cy="12" r="9" />
                          <path d="M12 7v5l3 2" />
                        </svg>
                        <span className="text-xs font-semibold whitespace-nowrap" style={{ color: footerColor }}>
                          {footerLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-faint truncate max-w-[110px]">{s.collectedBy}</span>
                        <Chevron />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        </div>

        <div className="hidden md:block pt-4">
          <div className="bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
            <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left border-collapse">
              <thead>
                <tr className="border-b border-border-soft">
                  {selectMode && <th className="w-10 py-2.5 pl-4" />}
                  <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Sample ID</th>
                  <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Name / Type</th>
                  <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Source</th>
                  <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Status</th>
                  <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3">Due / Completed</th>
                  <th className="text-[11px] font-semibold text-faint uppercase tracking-wider py-2.5 px-3 pr-4">Collected By</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s) => {
                  const statusStyle = STATUS_STYLES[s.status as SampleStatus];
                  const terminal = s.status === "Complete" || s.status === "Rejected";
                  const due = !terminal ? dueLabelFor(s.receivedDate, s.sampleType?.targetTatHours ?? 48) : null;
                  const footerLabel = terminal
                    ? s.status === "Complete"
                      ? s.approvedAt
                        ? `Completed ${formatDate(s.approvedAt)}`
                        : "Complete"
                      : "Needs correction"
                    : due!.label;
                  const footerColor = terminal ? (s.status === "Complete" ? "#1E7A34" : "#B00016") : due!.color;
                  const selected = selectedIds.has(s.id);

                  return (
                    <tr
                      key={s.id}
                      onClick={() => (selectMode ? toggleSelect(s.id) : router.push(`/samples/${s.id}`))}
                      className="border-b border-border-soft last:border-b-0 cursor-pointer hover:bg-chip-bg transition-colors"
                      style={{ background: selected ? "var(--color-primary-soft)" : undefined }}
                    >
                      {selectMode && (
                        <td className="py-2.5 pl-4">
                          <span
                            className="w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0"
                            style={{
                              borderColor: selected ? "var(--color-primary)" : "var(--color-border)",
                              background: selected ? "var(--color-primary)" : "transparent",
                            }}
                          >
                            {selected && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </span>
                        </td>
                      )}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: CUSTODY_DOT_COLOR[s.status as SampleStatus] }} />
                          <span className="text-[13px] font-semibold text-text font-mono-data">{s.id}</span>
                          {selectMode && isApprovable(s) && (
                            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-success/15 text-success-dark shrink-0">
                              Approvable
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 max-w-[240px]">
                        <div className="text-[13px] font-semibold text-text truncate">{s.name || s.type}</div>
                        {s.name && <div className="text-[11px] text-muted truncate">{s.type}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-[13px] text-muted max-w-[200px] truncate">{s.source}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{ background: statusStyle.bg, color: statusStyle.color }}
                        >
                          {SAMPLE_STATUS_SHORT[s.status as SampleStatus]}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[13px] font-semibold whitespace-nowrap" style={{ color: footerColor }}>
                        {footerLabel}
                      </td>
                      <td className="py-2.5 px-3 pr-4 text-[13px] text-muted truncate max-w-[160px]">{s.collectedBy}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>

        {samples.length === 0 && (
          <div className="px-5">
            <EmptyState>No samples match your search.</EmptyState>
          </div>
        )}

        <CursorPager {...pageInfo} />
      </div>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed left-0 right-0 bottom-[calc(100px+env(safe-area-inset-bottom))] md:bottom-4 z-30 px-5 flex justify-center">
          <div className="w-full max-w-[420px] bg-white border border-border rounded-[16px] shadow-[0_8px_28px_rgba(16,42,58,0.18)] px-4 py-3 flex items-center gap-2.5">
            <span className="text-xs font-semibold text-text shrink-0">{selectedIds.size} selected</span>
            <div className="flex-1" />
            <Link
              href={`/samples/label-batch?ids=${Array.from(selectedIds).join(",")}`}
              className="text-xs font-semibold text-primary px-2.5 py-2 rounded-full border border-border shrink-0"
            >
              Print Labels
            </Link>
            <Button size="sm" fullWidth={false} className="shrink-0 px-3.5" onClick={() => setShowConfirm(true)}>
              Approve
            </Button>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-5" onClick={() => !approving && setShowConfirm(false)}>
          <div
            className="w-full max-w-[360px] bg-white rounded-[18px] p-4 flex flex-col gap-2.5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[13px] font-semibold text-text">Approve {selectedIds.size} samples</div>
            <div className="text-xs text-muted">
              Only samples you have permission to approve at their current stage will actually be approved — others will be
              skipped and listed afterward.
            </div>
            <label className="text-[11px] font-semibold text-text" htmlFor="bulk-approve-password">
              Enter your password to sign this action
            </label>
            <input
              id="bulk-approve-password"
              type="password"
              value={approvePassword}
              onChange={(e) => setApprovePassword(e.target.value)}
              className={inputClassSm}
              autoFocus
            />
            {approveError && <div className="text-xs text-danger">{approveError}</div>}
            <div className="flex gap-2 mt-1">
              <Button variant="secondary" size="sm" disabled={approving} onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button size="sm" disabled={approving} onClick={submitBulkApprove}>
                {approving ? "Signing…" : "Confirm Approve"}
              </Button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="samples" unreadCount={unreadCount} />
    </div>
  );
}
