import Image from "next/image";
import Link from "next/link";
import { verifyPortalAccess } from "@/lib/tracking";
import { clientStageLabel, clientStageColors } from "@/lib/publicSample";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/db";

function NotFoundScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-page-bg px-6 text-center gap-3">
      <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={90} height={30} style={{ height: 30, width: "auto" }} priority />
      <div className="text-sm font-semibold text-text mt-2">Portal link not found</div>
      <div className="text-xs text-muted max-w-xs">
        This link is invalid or no longer active. Please contact the lab for an updated link.
      </div>
    </div>
  );
}

export default async function BusinessUnitPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const bu = await verifyPortalAccess(token);
  if (!bu) return <NotFoundScreen />;

  // No time-window cap here by design — the client sees its full sample
  // history through this link, not just recent activity.
  const samples = await prisma.sample.findMany({
    where: { businessUnitId: bu.id },
    select: { id: true, name: true, type: true, status: true, receivedDate: true },
    orderBy: { receivedDate: "desc" },
  });

  return (
    <div className="min-h-screen flex flex-col bg-page-bg px-5">
      <div className="flex-1 flex flex-col gap-5 py-8 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center gap-2">
          <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={90} height={30} style={{ height: 30, width: "auto" }} priority />
          <div className="text-[10.5px] font-semibold text-muted tracking-[0.14em] uppercase">Sample Portal</div>
        </div>

        <div>
          <div className="text-lg font-bold text-text tracking-tight">{bu.name}</div>
          <div className="text-[13px] text-muted mt-0.5">
            {samples.length} sample{samples.length === 1 ? "" : "s"} on record
          </div>
        </div>

        {samples.length === 0 ? (
          <div className="bg-white border border-border rounded-2xl shadow-card-sm p-5 text-[13px] text-muted text-center">
            No samples have been logged for this business unit yet.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {samples.map((s) => {
              const badge = clientStageColors(s.status);
              return (
                <Link
                  key={s.id}
                  href={`/portal/${token}/samples/${s.id}`}
                  className="bg-white border border-border rounded-[16px] shadow-card-sm p-4 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-muted font-mono-data tracking-tight">{s.id}</div>
                    <div className="text-sm font-bold text-text mt-0.5 truncate">{s.name || s.type}</div>
                    <div className="text-[11px] text-faint mt-0.5">Received {formatDate(s.receivedDate)}</div>
                  </div>
                  <span
                    className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                    style={{ background: badge.bg, color: badge.color }}
                  >
                    {clientStageLabel(s.status)}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        <div className="text-center text-[10px] text-faint tracking-wide mt-2">
          Powered by Product Specialist Microbiology
        </div>
      </div>
    </div>
  );
}
