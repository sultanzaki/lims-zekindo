import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canReviewAsSupervisor } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDateTime, formatDate } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import DeviationForm from "@/components/DeviationForm";
import DeviationsExportBar from "@/components/DeviationsExportBar";
import EmptyState from "@/components/ui/EmptyState";
import type { Metadata } from "next";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Open: { bg: "#FDECEA", color: "#B00016" },
  Investigating: { bg: "#FEF3E0", color: "#9A6100" },
  Closed: { bg: "#E6F4EA", color: "#1E7A34" },
};

const SEVERITY_STYLE: Record<string, { bg: string; color: string }> = {
  Minor: { bg: "#EEF2F5", color: "#5B6B74" },
  Major: { bg: "#FEF3E0", color: "#9A6100" },
  Critical: { bg: "#FDECEA", color: "#B00016" },
};

const SEVERITIES = ["Minor", "Major", "Critical"];

export const metadata: Metadata = { title: "Deviations" };

export default async function DeviationsPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string }>;
}) {
  const user = await requirePageRole(canReviewAsSupervisor);
  const { severity } = await searchParams;
  const severityFilter = severity && SEVERITIES.includes(severity) ? severity : null;

  const [deviations, unread, assignableUsers] = await Promise.all([
    prisma.deviation.findMany({
      where: severityFilter ? { severity: severityFilter } : {},
      orderBy: { openedAt: "desc" },
      take: 50,
      include: { sample: { select: { id: true, type: true } }, assignee: { select: { name: true } } },
    }),
    getUnreadCount(user.id),
    prisma.user.findMany({
      where: { active: true, OR: [{ accessRole: "SUPERVISOR" }, { accessRole: "QA_MANAGER" }, { accessRole: "ADMIN" }] },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const nowMs = new Date().getTime();
  const exportRows = deviations.map((d) => ({
    sampleId: d.sample.id,
    status: d.status,
    severity: d.severity ?? "",
    description: d.description,
    assigneeName: d.assignee?.name ?? "",
    dueDate: d.dueDate ? formatDate(d.dueDate) : "",
    openedAt: formatDateTime(d.openedAt),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Deviations" backHref="/profile" />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-28 md:pb-10 flex flex-col gap-3.5 md:max-w-[1200px] md:w-full">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <form className="no-print flex items-center gap-2" method="get">
            <span className="text-xs text-muted">Severity:</span>
            <select name="severity" defaultValue={severityFilter ?? ""} className="text-xs px-2.5 py-1.5 border border-border rounded-full bg-white text-text">
              <option value="">All</option>
              {SEVERITIES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <button type="submit" className="text-xs font-semibold text-primary px-2.5 py-1.5 rounded-full border border-primary-soft bg-primary-soft cursor-pointer">
              Apply
            </button>
          </form>
          <DeviationsExportBar rows={exportRows} />
        </div>

        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 md:gap-3.5 md:items-start">
          {deviations.map((d) => {
            const style = STATUS_STYLE[d.status] ?? STATUS_STYLE.Open;
            const overdue = d.status !== "Closed" && d.dueDate && d.dueDate.getTime() < nowMs;
            return (
              <div key={d.id} className="bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card p-4">
                <div className="flex items-center justify-between gap-2.5 mb-1.5">
                  <Link href={`/samples/${d.sample.id}`} className="text-sm font-semibold text-primary font-mono-data">
                    {d.sample.id}
                  </Link>
                  <div className="flex items-center gap-1.5">
                    {d.severity && (
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                        style={{ background: SEVERITY_STYLE[d.severity].bg, color: SEVERITY_STYLE[d.severity].color }}
                      >
                        {d.severity}
                      </span>
                    )}
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                      style={{ background: style.bg, color: style.color }}
                    >
                      {d.status}
                    </span>
                  </div>
                </div>
                <div className="text-[13px] text-text mb-1 leading-snug">{d.description}</div>
                <div className="text-xs text-faint mb-1">
                  Opened {formatDateTime(d.openedAt)}
                  {d.assignee && ` · Assigned to ${d.assignee.name}`}
                  {d.dueDate && (
                    <span style={overdue ? { color: "#B00016", fontWeight: 600 } : undefined}>
                      {" "}· Due {formatDate(d.dueDate)}{overdue ? " (overdue)" : ""}
                    </span>
                  )}
                </div>
                {d.status === "Closed" ? (
                  <div className="text-xs text-muted mt-1.5 pt-1.5 border-t border-border-soft">
                    {d.rootCause && <div><strong className="text-text">Root cause:</strong> {d.rootCause}</div>}
                    {d.capa && <div><strong className="text-text">CAPA:</strong> {d.capa}</div>}
                  </div>
                ) : (
                  <DeviationForm
                    deviationId={d.id}
                    rootCause={d.rootCause}
                    capa={d.capa}
                    assigneeId={d.assigneeId}
                    dueDate={d.dueDate ? d.dueDate.toISOString().slice(0, 10) : null}
                    severity={d.severity}
                    assignableUsers={assignableUsers}
                  />
                )}
              </div>
            );
          })}
          {deviations.length === 0 && <EmptyState>No deviations logged.</EmptyState>}
        </div>
      </div>
    </div>
  );
}
