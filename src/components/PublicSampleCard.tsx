import Link from "next/link";
import { formatDate, formatDateTime } from "@/lib/format";
import { parseSpecVerdict } from "@/lib/spec";
import AttachmentGallery from "@/components/AttachmentGallery";
import type { PublicSample, PublicSampleView } from "@/lib/publicSample";

const LAB_CONTACT_EMAIL = "sultan.rizaldy@zekindo.co.id";
const STAGES = ["Received", "Testing In Progress", "Under Review", "Completed"] as const;

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

  return (
    <>
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
            href={certificateHref}
            className="inline-flex items-center justify-center gap-1.5 bg-primary text-white rounded-full py-3.5 px-5 text-[15px] font-semibold"
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

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="text-[13px] text-muted shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-text text-right leading-snug">{value}</span>
    </div>
  );
}
