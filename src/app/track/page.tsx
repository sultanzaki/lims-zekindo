import Link from "next/link";
import { verifyTrackingAccess } from "@/lib/tracking";
import { loadPublicSample, preparePublicSampleView } from "@/lib/publicSample";
import PublicSampleCard, { contactMailtoHref } from "@/components/PublicSampleCard";
import PublicPageHeader from "@/components/PublicPageHeader";
import TrackLookupForm from "@/components/TrackLookupForm";

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 6 10-6" />
    </svg>
  );
}

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; code?: string }>;
}) {
  const { id, code } = await searchParams;
  const attempted = Boolean(id && code);
  const verifiedId = attempted ? await verifyTrackingAccess(id!, code!) : null;

  if (!verifiedId) {
    return <LookupForm showError={attempted} />;
  }

  const sample = await loadPublicSample(verifiedId);
  if (!sample) return <LookupForm showError />;

  const view = await preparePublicSampleView(sample);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <PublicPageHeader label="Sample Tracking" />
      <div className="flex-1 flex flex-col gap-4 px-5 pb-8 max-w-md mx-auto w-full">
        <PublicSampleCard sample={sample} view={view} certificateHref={`/track/certificate?id=${sample.id}&code=${code}`} />

        <Link href="/track" className="text-center text-xs font-semibold text-primary py-1">
          Track another sample
        </Link>

        <div className="text-center text-[10px] text-faint tracking-wide mt-2">
          Powered by Product Specialist Microbiology
        </div>
      </div>
    </div>
  );
}

function LookupForm({ showError }: { showError?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <PublicPageHeader label="Sample Tracking" />
      <div className="flex-1 flex flex-col gap-7 px-6 pb-10 max-w-sm mx-auto w-full">
        <TrackLookupForm showError={showError} />

        <a
          href={contactMailtoHref("(no sample ID entered)")}
          className="inline-flex items-center justify-center gap-2 text-[13px] font-semibold text-primary"
        >
          <MailIcon />
          Need help? Contact the Lab
        </a>
      </div>
    </div>
  );
}
