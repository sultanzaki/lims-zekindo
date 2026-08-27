import Image from "next/image";
import Link from "next/link";
import { verifyPortalAccess } from "@/lib/tracking";
import { loadPublicSample, preparePublicSampleView } from "@/lib/publicSample";
import PublicSampleCard from "@/components/PublicSampleCard";
import PublicPageHeader from "@/components/PublicPageHeader";

function NotFoundScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-page-bg px-6 text-center gap-3">
      <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={90} height={30} style={{ height: 30, width: "auto" }} priority />
      <div className="text-sm font-semibold text-text mt-2">Sample not found</div>
      <div className="text-xs text-muted max-w-xs">
        This sample doesn&apos;t exist or isn&apos;t part of this portal. Please contact the lab if you believe this is a mistake.
      </div>
    </div>
  );
}

function BackArrowIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5" />
      <path d="M12 19l-7-7 7-7" />
    </svg>
  );
}

export default async function BusinessUnitPortalSamplePage({
  params,
}: {
  params: Promise<{ token: string; id: string }>;
}) {
  const { token, id } = await params;
  const bu = await verifyPortalAccess(token);
  if (!bu) return <NotFoundScreen />;

  const sample = await loadPublicSample(id);
  // A valid token for one BU must never expose another BU's sample, even if
  // a real sample ID is hand-crafted into the URL — this check is the whole
  // reason /portal is scoped rather than a flat token-only lookup.
  if (!sample || sample.businessUnitId !== bu.id) return <NotFoundScreen />;

  const view = await preparePublicSampleView(sample);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <PublicPageHeader label={`${bu.name} — Sample Portal`} />
      <div className="flex-1 flex flex-col gap-4 px-5 pt-6 pb-8 max-w-md mx-auto w-full">
        <PublicSampleCard
          sample={sample}
          view={view}
          certificateHref={`/track/certificate?id=${sample.id}&code=${sample.accessCode ?? ""}`}
        />

        <Link
          href={`/portal/${token}`}
          className="inline-flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-primary py-1"
        >
          <BackArrowIcon />
          Back to all samples
        </Link>

        <div className="text-center text-[10px] text-faint tracking-wide">
          Powered by Product Specialist Microbiology
        </div>
      </div>
    </div>
  );
}
