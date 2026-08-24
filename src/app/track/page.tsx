import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { verifyTrackingAccess } from "@/lib/tracking";
import { formatDate, formatDateTime } from "@/lib/format";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

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
    include: { sampleType: { select: { targetTatHours: true } }, businessUnit: { select: { name: true } } },
  });
  if (!sample) return <LookupForm showError />;

  const rejected = sample.status === "Rejected";
  const stageIndex = stageIndexFor(sample.status);
  const targetHours = sample.sampleType?.targetTatHours ?? 48;
  const estimatedCompletion = new Date(sample.receivedDate.getTime() + targetHours * 60 * 60 * 1000);

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

        <Link href="/track" className="text-center text-xs font-semibold text-primary">
          Track another sample
        </Link>
      </div>
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
      </div>
    </div>
  );
}
