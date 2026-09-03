import Image from "next/image";
import { verifyPortalAccess } from "@/lib/tracking";
import { prisma } from "@/lib/db";
import PublicPageHeader from "@/components/PublicPageHeader";
import PortalSampleList from "@/components/PortalSampleList";
import type { Metadata } from "next";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const bu = await verifyPortalAccess(token);
  return { title: bu ? `${bu.name} Portal` : "Portal" };
}

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
    <div className="min-h-screen flex flex-col bg-page-bg">
      <PublicPageHeader label="Sample Portal" />
      <div className="flex-1 flex flex-col gap-4 px-5 pt-6 pb-8 max-w-md mx-auto w-full">
        <div className="bg-white rounded-[16px] shadow-card-sm border border-border px-5 py-4">
          <div className="text-lg font-bold text-text tracking-tight">{bu.name}</div>
          <div className="text-[13px] text-muted mt-0.5">
            {samples.length} sample{samples.length === 1 ? "" : "s"} on record
          </div>
        </div>

        <PortalSampleList token={token} samples={samples} />

        <div className="text-center text-[10px] text-faint tracking-wide mt-2">
          Powered by Product Specialist Microbiology
        </div>
      </div>
    </div>
  );
}
