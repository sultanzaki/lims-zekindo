import Image from "next/image";
import Link from "next/link";
import { verifyTrackingAccess } from "@/lib/tracking";
import { loadPublicSample, preparePublicSampleView } from "@/lib/publicSample";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import PublicSampleCard, { contactMailtoHref } from "@/components/PublicSampleCard";

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
    <div className="min-h-screen flex flex-col bg-page-bg px-5">
      <div className="flex-1 flex flex-col gap-6 py-8 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center gap-2">
          <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={90} height={30} style={{ height: 30, width: "auto" }} priority />
          <div className="text-[10.5px] font-semibold text-muted tracking-[0.14em] uppercase">Sample Tracking</div>
        </div>

        <PublicSampleCard sample={sample} view={view} certificateHref={`/track/certificate?id=${sample.id}&code=${code}`} />

        <Link href="/track" className="text-center text-xs font-semibold text-primary">
          Track another sample
        </Link>

        <div className="text-center text-[10px] text-faint tracking-wide">
          Powered by Product Specialist Microbiology
        </div>
      </div>
    </div>
  );
}

function LookupForm({ showError }: { showError?: boolean }) {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg px-6">
      <div className="flex-1 flex flex-col justify-center gap-7 py-10 max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/zekindo-logo.png"
            alt="Zekindo Chemicals"
            width={90}
            height={30}
            style={{ height: 30, width: "auto" }}
            priority
          />
          <div className="text-[10.5px] font-semibold text-muted tracking-[0.14em] uppercase text-center">
            Sample Tracking
          </div>
        </div>

        <form method="GET" action="/track" className="flex flex-col gap-4 bg-white rounded-[18px] shadow-card p-6 border border-border">
          <div>
            <div className="text-[19px] font-bold text-text mb-1 tracking-tight">Track your sample</div>
            <div className="text-[13px] text-muted">
              Enter the Sample ID and Access Code provided by the lab to see its status.
            </div>
          </div>

          <Field label="Sample ID" htmlFor="id">
            <input id="id" name="id" type="text" placeholder="e.g. LAB-24-0142" required autoCapitalize="characters" className={inputClass} />
          </Field>

          <Field label="Access Code" htmlFor="code">
            <input id="code" name="code" type="text" placeholder="e.g. K7XQ-2MNP" required autoCapitalize="characters" className={inputClass} />
          </Field>

          {showError && (
            <div className="text-xs font-medium text-danger -mt-1">
              Sample ID or Access Code is incorrect. Please check and try again.
            </div>
          )}

          <Button type="submit" className="mt-1">
            Track Sample
          </Button>
        </form>

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
