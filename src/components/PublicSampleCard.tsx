import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/format";
import { parseSpecVerdict } from "@/lib/spec";
import { clientStageLabel, clientStageColors } from "@/lib/publicStage";
import AttachmentGallery from "@/components/AttachmentGallery";
import type { PublicSample, PublicSampleView } from "@/lib/publicSample";

const LAB_CONTACT_EMAIL = "sultan.rizaldy@zekindo.co.id";
const STAGES = [
  { label: "Received", Icon: InboxIcon },
  { label: "Testing", Icon: FlaskIcon },
  { label: "Review", Icon: ClipboardCheckIcon },
  { label: "Complete", Icon: AwardIcon },
] as const;

export function contactMailtoHref(sampleId: string) {
  const subject = `Inquiry about Sample ${sampleId}`;
  const body = `Hi Zekindo Lab team,\n\nI have a question regarding sample ${sampleId}.\n\n`;
  return `mailto:${LAB_CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function MailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 6 10-6" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function InboxIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
    </svg>
  );
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M9 2v6.5L4.5 18a2 2 0 001.8 2.9h11.4a2 2 0 001.8-2.9L15 8.5V2" />
      <path d="M8 2h8" />
      <path d="M7.5 15h9" />
    </svg>
  );
}

function ClipboardCheckIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 2h6a1 1 0 011 1v2a1 1 0 01-1 1H9a1 1 0 01-1-1V3a1 1 0 011-1z" />
      <path d="M9 13l2 2 4-4" />
    </svg>
  );
}

function AwardIcon({ className }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="5.5" />
      <path d="M8.5 13L7 22l5-2.5L17 22l-1.5-9" />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-faint">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-faint">
      <rect x="4" y="2" width="16" height="20" rx="1" />
      <path d="M9 22v-4h6v4M9 6h.01M15 6h.01M9 10h.01M15 10h.01M9 14h.01M15 14h.01" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-faint">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function CalendarCheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-faint">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <path d="M9 15l2 2 4-4" />
    </svg>
  );
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * The actual sample-detail content shared by both public surfaces: the
 * per-sample tracking portal (/track) and the Business-Unit client portal
 * (/portal/[token]/samples/[id]). Each caller supplies its own page chrome
 * (logo header, back link, footer) and just hands this the loaded sample,
 * the precomputed view (from preparePublicSampleView), and where the "View
 * Certificate of Analysis" button should go.
 */
export default function PublicSampleCard({
  sample,
  view,
  certificateHref,
}: {
  sample: PublicSample;
  view: PublicSampleView;
  certificateHref: string;
}) {
  const { rejected, completed, stageIndex, estimatedCompletion, testsWithUrls, reportsWithUrls, testedCount, totalCount, progressPct } = view;
  const badge = clientStageColors(sample.status);

  return (
    <>
      <div className="bg-white rounded-[20px] shadow-card border border-border p-5 flex flex-col gap-5 -mt-8 relative">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-faint font-mono-data tracking-wide">{sample.id}</div>
            <div className="text-[19px] font-bold text-text mt-1 tracking-tight leading-snug">{sample.name || sample.type}</div>
            <div className="text-[13px] text-muted mt-0.5">{sample.type}</div>
          </div>
          <span
            className="text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
            style={{ background: badge.bg, color: badge.color }}
          >
            {clientStageLabel(sample.status)}
          </span>
        </div>

        {rejected ? (
          <div className="bg-danger-bg border border-danger/20 rounded-[14px] p-4 flex items-start gap-3 text-danger">
            <AlertTriangleIcon />
            <div className="text-[13px] leading-relaxed">
              This sample requires attention from the lab team. Please contact the lab for details.
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 py-1">
            <div className="flex items-center">
              {STAGES.map(({ label, Icon }, i) => (
                <div key={label} className="flex items-center flex-1 last:flex-none">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all"
                    style={{
                      background: i <= stageIndex ? "#1A5F7A" : "#EEF2F5",
                      color: i <= stageIndex ? "#fff" : "#93A6B0",
                      boxShadow: i === stageIndex ? "0 0 0 4px #E8F4FA" : "none",
                    }}
                  >
                    {i < stageIndex ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <Icon />
                    )}
                  </div>
                  {i < STAGES.length - 1 && (
                    <div className="h-[2px] flex-1 mx-0.5" style={{ background: i < stageIndex ? "#1A5F7A" : "#EEF2F5" }} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex">
              {STAGES.map(({ label }, i) => (
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

        <div className="flex flex-col gap-3 pt-1 border-t border-border-soft">
          <InfoRow icon={<UserIcon />} label="Requestor" value={sample.requestorName || "—"} />
          <InfoRow icon={<BuildingIcon />} label="Business Unit" value={sample.businessUnit?.name || "—"} />
          <InfoRow icon={<ClockIcon />} label="Received" value={formatDateTime(sample.receivedDate)} />
          {!rejected && sample.status !== "Complete" && (
            <InfoRow icon={<CalendarCheckIcon />} label="Est. completion" value={formatDate(estimatedCompletion)} />
          )}
          {sample.status === "Complete" && sample.approvedAt && (
            <InfoRow icon={<CalendarCheckIcon />} label="Completed" value={formatDateTime(sample.approvedAt)} />
          )}
        </div>

        {sample.status === "Complete" && (
          <Link
            href={certificateHref}
            className="inline-flex items-center justify-center gap-1.5 bg-primary text-white rounded-full py-3.5 px-5 text-[15px] font-semibold shadow-[0_6px_16px_rgba(43,141,184,0.26)]"
          >
            View Certificate of Analysis
          </Link>
        )}
      </div>

      {completed && reportsWithUrls.length > 0 && (
        <div className="bg-white rounded-[18px] shadow-card border border-border p-5 flex flex-col gap-3">
          <div className="text-[15px] font-bold text-text tracking-tight">Report</div>
          <div className="flex flex-col gap-2">
            {reportsWithUrls.map((r) => (
              <div key={r.id} className="flex items-center gap-2.5 bg-page-bg border border-border-soft rounded-[12px] px-3 py-2.5">
                <FileIcon />
                <div className="flex-1 min-w-0">
                  {r.url ? (
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[13px] font-medium text-primary truncate block">
                      {r.fileName}
                    </a>
                  ) : (
                    <span className="text-[13px] font-medium text-faint truncate block">{r.fileName}</span>
                  )}
                  <div className="text-[11px] text-faint mt-0.5">{formatBytes(r.fileSize)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
    </>
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

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-1.5 text-[13px] text-muted shrink-0">
        {icon}
        {label}
      </span>
      <span className="text-[13px] font-semibold text-text text-right leading-snug">{value}</span>
    </div>
  );
}
