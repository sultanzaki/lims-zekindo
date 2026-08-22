import { requirePageRole } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import EmptyState from "@/components/ui/EmptyState";

export default async function AdminAuditPage() {
  await requirePageRole(isAdmin);
  const entries = await prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { user: { select: { name: true } } },
  });

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <BackHeader title="Audit Log" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-2">
        <div className="text-[11px] text-muted -mt-1 mb-1">Most recent 100 events</div>
        {entries.map((e) => (
          <div key={e.id} className="bg-white border border-border rounded-xl p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[13px] font-semibold text-text">{e.action}</span>
              <span className="text-[11px] text-faint shrink-0">{formatDateTime(e.createdAt)}</span>
            </div>
            <div className="text-[11px] text-muted mt-0.5">
              {e.user?.name ?? "System"} · {e.entityType} {e.entityId}
              {e.detail ? ` · ${e.detail}` : ""}
            </div>
          </div>
        ))}
        {entries.length === 0 && <EmptyState>No activity logged yet.</EmptyState>}
      </div>
    </div>
  );
}
