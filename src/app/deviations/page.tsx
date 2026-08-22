import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { canReviewAsSupervisor } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import DeviationForm from "@/components/DeviationForm";

const STATUS_COLOR: Record<string, string> = {
  Open: "#D0021B",
  Investigating: "#a36a00",
  Closed: "#1e7a34",
};

export default async function DeviationsPage() {
  await requirePageRole(canReviewAsSupervisor);
  const deviations = await prisma.deviation.findMany({
    orderBy: { openedAt: "desc" },
    take: 50,
    include: { sample: { select: { id: true, type: true } } },
  });

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <BackHeader title="Deviations" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-3">
        {deviations.map((d) => (
          <div key={d.id} className="bg-white border border-border rounded-xl p-3.5">
            <div className="flex items-center justify-between gap-2 mb-1">
              <Link href={`/samples/${d.sample.id}`} className="text-[13px] font-semibold text-primary">
                {d.sample.id}
              </Link>
              <span
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: "#F0F4F8", color: STATUS_COLOR[d.status] ?? "#6B8A96" }}
              >
                {d.status}
              </span>
            </div>
            <div className="text-xs text-text mb-1">{d.description}</div>
            <div className="text-[11px] text-faint mb-1">Opened {formatDateTime(d.openedAt)}</div>
            {d.status === "Closed" ? (
              <div className="text-xs text-muted mt-1">
                {d.rootCause && <div><strong className="text-text">Root cause:</strong> {d.rootCause}</div>}
                {d.capa && <div><strong className="text-text">CAPA:</strong> {d.capa}</div>}
              </div>
            ) : (
              <DeviationForm deviationId={d.id} rootCause={d.rootCause} capa={d.capa} />
            )}
          </div>
        ))}
        {deviations.length === 0 && <div className="text-xs text-muted">No deviations logged.</div>}
      </div>
    </div>
  );
}
