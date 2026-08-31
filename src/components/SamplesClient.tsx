"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import Chevron from "@/components/ui/Chevron";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import { inputClassSm } from "@/components/ui/Field";
import { SAMPLE_STATUSES, STATUS_STYLES, CUSTODY_DOT_COLOR, SAMPLE_STATUS_SHORT, type SampleStatus } from "@/lib/status";
import { dueLabelFor, dayGroupLabel, formatDate } from "@/lib/format";
import { canReviewAsSupervisor, canApproveAsQa } from "@/lib/roles";
import { bulkApproveSamplesAction, type BulkApproveResult } from "@/lib/actions/samples";

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
}: {
  samples: SampleRow[];
  unreadCount: number;
  role: string;
  userName: string;
  initialStatus?: string;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(initialStatus);
  const [showFilters, setShowFilters] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [approvePassword, setApprovePassword] = useState("");
  const [approveError, setApproveError] = useState("");
  const [approveResult, setApproveResult] = useState<BulkApproveResult | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

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
        (s.name ?? "").toLowerCase().includes(q) ||
        s.type.toLowerCase().includes(q) ||
        s.source.toLowerCase().includes(q) ||
        s.collectedBy.toLowerCase().includes(q)
      );
    });
  }, [samples, query, statusFilter, dateFrom, dateTo]);

  const hasDateFilter = dateFrom || dateTo;

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { All: samples.length };
    for (const status of SAMPLE_STATUSES) counts[status] = 0;
    for (const s of samples) counts[s.status] = (counts[s.status] ?? 0) + 1;
    return counts;
  }, [samples]);

  const groups = useMemo(() => {
    return DAY_GROUP_ORDER.map((label) => ({
      label,
      items: filtered.filter((s) => dayGroupLabel(s.receivedDate) === label),
    })).filter((g) => g.items.length > 0);
  }, [filtered]);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={role} userName={userName} unreadCount={unreadCount} />
      <div className="sticky top-0 bg-white border-b border-border-soft px-5 md:px-8 pt-6 md:pt-10 pb-2.5 z-10">
      <div className="md:max-w-[1400px] md:mx-auto md:w-full flex flex-col gap-3">
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
        <div className="relative -mx-5 md:mx-0">
          <div className="flex gap-1.5 overflow-x-auto pb-0.5 px-5 md:px-0">
            {STATUS_OPTIONS.map((opt) => {
              const active = statusFilter === opt;
              return (
                <button
                  key={opt}
                  onClick={() => setStatusFilter(opt)}
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
          <div className="pointer-events-none absolute top-0 right-0 bottom-0.5 w-8 bg-gradient-to-l from-white to-transparent md:hidden" />
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
            onClick={() => downloadCsv(filtered)}
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
              onChange={(e) => setDateFrom(e.target.value)}
              className="flex-1 text-xs px-2.5 py-2 border border-border rounded-[10px] text-text bg-white"
            />
            <span className="text-xs text-muted">to</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="flex-1 text-xs px-2.5 py-2 border border-border rounded-[10px] text-text bg-white"
            />
          </div>
        )}
      </div>
      </div>

      <div className="flex-1 pb-5 flex flex-col md:px-8">
      <div className="md:max-w-[1400px] md:mx-auto md:w-full">
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

        <div className="hidden md:block px-8 pt-4">
          <div className="bg-white border border-border rounded-2xl shadow-card-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
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
                {filtered.map((s) => {
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
                      <td className="py-2.5 px-3">
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

        {filtered.length === 0 && (
          <div className="px-5">
            <EmptyState>No samples match your search.</EmptyState>
          </div>
        )}
      </div>
      </div>

      {selectMode && selectedIds.size > 0 && (
        <div className="fixed left-0 right-0 bottom-[76px] md:bottom-4 z-30 px-5 flex justify-center">
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
