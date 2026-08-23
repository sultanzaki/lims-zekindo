import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { canReviewAsSupervisor } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import DeviationForm from "@/components/DeviationForm";
import EmptyState from "@/components/ui/EmptyState";

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  Open: { bg: "#FDECEA", color: "#B00016" },
  Investigating: { bg: "#FEF3E0", color: "#9A6100" },
  Closed: { bg: "#E6F4EA", color: "#1E7A34" },
};

export default async function DeviationsPage() {
  await requirePageRole(canReviewAsSupervisor);
  const deviations = await prisma.deviation.findMany({
    orderBy: { openedAt: "desc" },
    take: 50,
    include: { sample: { select: { id: true, type: true } } },
  });

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <BackHeader title="Deviations" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-3">
        {deviations.map((d) => {
          const style = STATUS_STYLE[d.status] ?? STATUS_STYLE.Open;
          return (
            <div key={d.id} className="bg-white border border-border rounded-[18px] shadow-card p-4">
              <div className="flex items-center justify-between gap-2.5 mb-1.5">
                <Link href={`/samples/${d.sample.id}`} className="text-sm font-semibold text-primary font-mono-data">
                  {d.sample.id}
                </Link>
                <span
                  className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                  style={{ background: style.bg, color: style.color }}
                >
                  {d.status}
                </span>
              </div>
              <div className="text-[13px] text-text mb-1 leading-snug">{d.description}</div>
              <div className="text-xs text-faint mb-1">Opened {formatDateTime(d.openedAt)}</div>
              {d.status === "Closed" ? (
                <div className="text-xs text-muted mt-1.5 pt-1.5 border-t border-border-soft">
                  {d.rootCause && <div><strong className="text-text">Root cause:</strong> {d.rootCause}</div>}
                  {d.capa && <div><strong className="text-text">CAPA:</strong> {d.capa}</div>}
                </div>
              ) : (
                <DeviationForm deviationId={d.id} rootCause={d.rootCause} capa={d.capa} />
              )}
            </div>
          );
        })}
        {deviations.length === 0 && <EmptyState>No deviations logged.</EmptyState>}
      </div>
    </div>
  );
}
