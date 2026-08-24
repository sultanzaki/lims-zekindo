import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifyTrackingAccess } from "@/lib/tracking";
import { signedAttachmentUrl } from "@/lib/storage";
import { formatDate, formatDateTime } from "@/lib/format";
import { parseSpecVerdict } from "@/lib/spec";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import AttachmentGallery from "@/components/AttachmentGallery";

const LAB_CONTACT_EMAIL = "sultan.rizaldy@zekindo.co.id";
const STAGES = ["Received", "Testing In Progress", "Under Review", "Completed"] as const;

function stageIndexFor(status: string): number {
  switch (status) {
    case "Pending Login":
      return 0;
    case "In Testing":
      return 1;
    case "Awaiting Supervisor Review":
    case "Awaiting QA Approval":
      return 2;
    case "Complete":
      return 3;
    default:
      return 0;
  }
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 6 10-6" />
    </svg>
  );
}

function contactMailtoHref(sampleId: string) {
  const subject = `Inquiry about Sample ${sampleId}`;
  const body = `Hi Zekindo Lab team,\n\nI have a question regarding sample ${sampleId}.\n\n`;
  return `mailto:${LAB_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
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

  const sample = await prisma.sample.findUnique({
    where: { id: verifiedId },
    include: {
      sampleType: { select: { targetTatHours: true } },
      businessUnit: { select: { name: true } },
      tests: { orderBy: { order: "asc" }, include: { attachments: { orderBy: { uploadedAt: "asc" } } } },
    },
  });
  if (!sample) return <LookupForm showError />;

  const rejected = sample.status === "Rejected";
  const completed = sample.status === "Complete";
  const stageIndex = stageIndexFor(sample.status);
  const targetHours = sample.sampleType?.targetTatHours ?? 48;
  const estimatedCompletion = new Date(sample.receivedDate.getTime() + targetHours * 60 * 60 * 1000);

  // Values and supporting documents are only shown to the requestor once the
  // whole sample has cleared supervisor + QA review — a result can still be
  // corrected during review, so nothing preliminary goes out under the
  // lab's name. Per-parameter progress is safe to show at any stage.
  const testsWithUrls = await Promise.all(
    sample.tests.map(async (test) => ({
      ...test,
      attachments: completed
        ? await Promise.all(
            test.attachments.map(async (a) => ({ ...a, url: await signedAttachmentUrl(a.storagePath) }))
          )
        : [],
    }))
  );
  const testedCount = sample.tests.filter((t) => t.status === "awaiting" || completed).length;
  const totalCount = sample.tests.length;
  const progressPct = totalCount > 0 ? Math.round((testedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col bg-page-bg px-5">
      <div className="flex-1 flex flex-col gap-6 py-8 max-w-md mx-auto w-full">
        <div className="flex flex-col items-center gap-2">
          <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={90} height={30} style={{ height: 30, width: "auto" }} priority />
          <div className="text-[10.5px] font-semibold text-muted tracking-[0.14em] uppercase">Sample Tracking</div>
        </div>

        <div className="bg-white rounded-[18px] shadow-card border border-border p-5 flex flex-col gap-5">
          <div>
            <div className="text-xs font-semibold text-muted font-mono-data tracking-tight">{sample.id}</div>
            <div className="text-lg font-bold text-text mt-0.5 tracking-tight">{sample.name || sample.type}</div>
            <div className="text-[13px] text-muted mt-0.5">{sample.type}</div>
          </div>

          {rejected ? (
            <div className="bg-danger-bg border border-danger/30 rounded-[13px] p-3.5 text-[13px] text-danger">
              This sample requires attention from the lab team. Please contact the lab for details.
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center">
                {STAGES.map((label, i) => (
                  <div key={label} className="flex items-center flex-1 last:flex-none">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                      style={{
                        background: i <= stageIndex ? "#1A5F7A" : "#EEF2F5",
                        color: i <= stageIndex ? "#fff" : "#93A6B0",
                      }}
                    >
                      {i < stageIndex ? "✓" : i + 1}
                    </div>
                    {i < STAGES.length - 1 && (
                      <div className="h-[2px] flex-1" style={{ background: i < stageIndex ? "#1A5F7A" : "#EEF2F5" }} />
                    )}
                  </div>
                ))}
              </div>
              <div className="flex">
                {STAGES.map((label, i) => (
                  <span
                    key={label}
                    className="flex-1 text-[10px] font-semibold text-center leading-tight px-0.5"
                    style={{ color: i <= stageIndex ? "#1A5F7A" : "#93A6B0" }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5 pt-1 border-t border-border-soft">
            <InfoRow label="Requestor" value={sample.requestorName || "—"} />
            <InfoRow label="Business Unit" value={sample.businessUnit?.name || "—"} />
            <InfoRow label="Received" value={formatDateTime(sample.receivedDate)} />
            {!rejected && sample.status !== "Complete" && (
              <InfoRow label="Estimated completion" value={formatDate(estimatedCompletion)} />
            )}
            {sample.status === "Complete" && sample.approvedAt && (
              <InfoRow label="Completed" value={formatDateTime(sample.approvedAt)} />
            )}
          </div>

          {sample.status === "Complete" && (
            <Link
              href={`/track/certificate?id=${sample.id}&code=${code}`}
              className="inline-flex items-center justify-center gap-1.5 bg-primary text-white rounded-full py-3.5 px-5 text-[15px] font-semibold"
            >
              View Certificate of Analysis
            </Link>
          )}
        </div>

        {!rejected && totalCount > 0 && (
          <div className="bg-white rounded-[18px] shadow-card border border-border p-5 flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="text-[15px] font-bold text-text tracking-tight">Test Parameters</div>
                <span className="text-[11px] font-semibold text-muted whitespace-nowrap">
                  {testedCount}/{totalCount} tested
                </span>
              </div>
              <div className="h-[7px] rounded-full bg-[#EEF2F5] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${progressPct}%`, background: completed ? "#28A745" : "#2B8DB8" }}
                />
              </div>
              {!completed && (
                <p className="text-[11px] text-faint mt-2 leading-relaxed">
                  Measured values and supporting documents are released once every parameter has cleared
                  supervisor and QA review, so nothing preliminary is shown here before then.
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2.5">
              {testsWithUrls.map((test) => (
                <ParameterRow key={test.id} test={test} revealDetail={completed} />
              ))}
            </div>
          </div>
        )}

        <a
          href={contactMailtoHref(sample.id)}
          className="inline-flex items-center justify-center gap-2 bg-white border border-border text-text rounded-full py-3.5 px-5 text-[14px] font-semibold shadow-card-sm"
        >
          <MailIcon />
          Contact the Lab
        </a>

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

type ParameterTest = {
  id: string;
  name: string;
  status: string;
  result: string | null;
  unit: string;
  spec: string;
  attachments: { id: string; fileName: string; fileType: string; fileSize: number; url: string | null }[];
};

function ParameterRow({ test, revealDetail }: { test: ParameterTest; revealDetail: boolean }) {
  const submitted = test.status === "awaiting";
  const verdict = revealDetail ? parseSpecVerdict(test.spec, test.result) : null;

  const pill = revealDetail
    ? verdict === "Fail"
      ? { label: "Fail", bg: "#FDECEA", color: "#B00016" }
      : verdict === "Pass"
        ? { label: "Pass", bg: "#E6F4EA", color: "#1E7A34" }
        : { label: "Reported", bg: "#EEF2F5", color: "#5B6B74" }
    : submitted
      ? { label: "Under review", bg: "#FEF3E0", color: "#9A6100" }
      : { label: "Not started", bg: "#EEF2F5", color: "#93A6B0" };

  return (
    <div className="border border-border-soft rounded-[14px] p-3.5 flex flex-col gap-2.5">
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-text leading-snug">{test.name}</div>
          <div className="text-[11px] text-muted mt-0.5">Spec: {test.spec}</div>
        </div>
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
          style={{ background: pill.bg, color: pill.color }}
        >
          {pill.label}
        </span>
      </div>

      {revealDetail && (
        <div className="pt-2 border-t border-border-soft flex flex-col gap-2.5">
          <div className="text-[15px] font-bold text-text font-mono-data">
            {test.result} {test.unit}
          </div>
          {test.attachments.length > 0 && <AttachmentGallery attachments={test.attachments} canDownloadDocs={true} />}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] text-muted shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-text text-right leading-snug">{value}</span>
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
