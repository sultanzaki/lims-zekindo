"use client";

import { useState } from "react";
import Link from "next/link";
import type { getSampleDetail } from "@/lib/data";
import type { FormState } from "@/lib/actions/samples";
import { formatDateTime } from "@/lib/format";
import { CUSTODY_DOT_COLOR, STATUS_STYLES, TEST_STATUS_STYLES, type SampleStatus, type TestStatus } from "@/lib/status";
import { parseSpecVerdict, specNumericLimit } from "@/lib/spec";
import StatusBadge from "@/components/StatusBadge";
import StorageLocationForm from "@/components/StorageLocationForm";
import ReviewPanel from "@/components/ReviewPanel";
import AttachmentGallery from "@/components/AttachmentGallery";
import SampleReportPanel from "@/components/SampleReportPanel";
import NfcTagPanel from "@/components/NfcTagPanel";
import Sidebar from "@/components/Sidebar";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";

type SampleDetailBase = NonNullable<Awaited<ReturnType<typeof getSampleDetail>>>;
type BaseTest = SampleDetailBase["tests"][number];
type AttachmentWithUrl = BaseTest["attachments"][number] & { url: string | null };
type TestWithAttachmentUrls = Omit<BaseTest, "attachments"> & { attachments: AttachmentWithUrl[] };
type BaseReport = SampleDetailBase["reports"][number];
type ReportWithUrl = BaseReport & { url: string | null };
type SampleDetail = Omit<SampleDetailBase, "tests" | "reports"> & { tests: TestWithAttachmentUrls[]; reports: ReportWithUrl[] };
type ServerAction = (prevState: FormState, formData: FormData) => Promise<FormState>;

const TABS = ["Results", "Details", "Custody"] as const;
type Tab = (typeof TABS)[number];

function parseResultNumber(result: string | null | undefined): number | null {
  if (!result) return null;
  const n = parseFloat(String(result).replace(/[^0-9.\-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

export default function SampleDetailClient({
  sample,
  targetHours,
  dueAt,
  isOverdue,
  trackingUrl,
  accessCodeFormatted,
  activeNfcTag,
  actions,
  role,
  userName,
  unreadCount,
}: {
  sample: SampleDetail;
  targetHours: number;
  dueAt: Date;
  isOverdue: boolean;
  trackingUrl: string | null;
  accessCodeFormatted: string | null;
  activeNfcTag: { registeredBy: string; registeredAt: Date } | null;
  actions: {
    canReviewAsSupervisor: boolean;
    canApproveAsQa: boolean;
    canManageReports: boolean;
    supervisorApproveAction: ServerAction;
    supervisorRejectAction: ServerAction;
    qaApproveAction: ServerAction;
    qaRejectAction: ServerAction;
    retestSampleAction: () => Promise<void>;
    markDisposedAction: () => Promise<void>;
    uploadSampleReportAction: ServerAction;
    deleteSampleReportAction: (reportId: string) => Promise<void>;
  };
  role: string;
  userName: string;
  unreadCount: number;
}) {
  const [tab, setTab] = useState<Tab>("Results");
  const canDownloadDocs = actions.canReviewAsSupervisor || actions.canApproveAsQa;

  const status = sample.status as SampleStatus;
  const statusStyle = STATUS_STYLES[status];
  const openDeviation = sample.deviations.find((d) => d.status !== "Closed");
  const lastDotColor = CUSTODY_DOT_COLOR[status] ?? "#2B8DB8";

  const resultsContent = (
    <>
      <SampleReportPanel
        reports={sample.reports}
        canManage={actions.canManageReports}
        canUpload={true}
        uploadAction={actions.uploadSampleReportAction}
        deleteAction={actions.deleteSampleReportAction}
      />

      {sample.tests.map((test) => {
        const st = TEST_STATUS_STYLES[test.status as TestStatus];
        const hasResult = test.result != null;
        const verdict = hasResult ? parseSpecVerdict(test.spec, test.result) : null;
        const verdictBg = verdict === "Pass" ? "#E6F4EA" : verdict === "Fail" ? "#FDECEA" : "#EEF2F5";
        const verdictColor = verdict === "Pass" ? "#1E7A34" : verdict === "Fail" ? "#B00016" : "#5B6B74";
        const verdictNote = verdict === "Pass" ? "Within limit" : verdict === "Fail" ? "Exceeds limit" : "Manual review";
        const limit = specNumericLimit(test.spec);
        const resultN = parseResultNumber(test.result);
        const showBar = hasResult && limit != null && limit > 0 && resultN != null && /^[≤<]/.test(test.spec.trim());
        const barPct = showBar ? Math.min(100, Math.max(0, ((resultN as number) / (limit as number)) * 100)) : 0;

        return (
          <div key={test.id} className="bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card overflow-hidden">
            <div className="flex items-start justify-between gap-2.5 px-[15px] pt-3.5 pb-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-text leading-snug">{test.name}</div>
                {test.notes && <div className="text-xs text-muted mt-0.5">{test.notes}</div>}
              </div>
              <span
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                style={{ background: st.bg, color: st.color }}
              >
                {st.label}
              </span>
            </div>

            {hasResult ? (
              <>
                <div className="flex items-stretch border-t border-border-soft">
                  <div className="flex-1 px-[15px] py-3 border-r border-border-soft">
                    <div className="text-[11px] text-faint tracking-wide uppercase font-semibold">Result</div>
                    <div className="text-lg font-bold text-text font-mono-data mt-1 leading-tight">{test.result}</div>
                    <div className="text-[11px] text-muted mt-0.5">{test.unit}</div>
                  </div>
                  <div className="flex-1 px-[15px] py-3 border-r border-border-soft">
                    <div className="text-[11px] text-faint tracking-wide uppercase font-semibold">Spec</div>
                    <div className="text-sm font-semibold text-[#444] font-mono-data mt-1.5 leading-snug">{test.spec}</div>
                  </div>
                  <div className="w-[92px] px-3 py-3 flex flex-col justify-center" style={{ background: verdictBg }}>
                    <div className="text-[13px] font-bold leading-tight" style={{ color: verdictColor }}>
                      {verdict ?? "—"}
                    </div>
                    <div className="text-[11px] mt-0.5 opacity-80" style={{ color: verdictColor }}>
                      {verdictNote}
                    </div>
                  </div>
                </div>
                {showBar && (
                  <div className="px-[15px] pt-3 pb-3.5 border-t border-border-soft">
                    <div className="relative h-2 rounded-full bg-[#EEF2F5] overflow-hidden">
                      <div
                        className="absolute left-0 top-0 bottom-0 rounded-full"
                        style={{ width: `${barPct}%`, background: verdictColor }}
                      />
                    </div>
                    <div className="flex justify-between mt-1.5 text-[11px] text-faint font-mono-data">
                      <span>0</span>
                      <span>limit {test.spec}</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="px-[15px] pb-3.5 flex flex-col gap-2.5 border-t border-border-soft pt-3">
                <div className="flex justify-between text-xs text-muted">
                  <span>Spec limit</span>
                  <span className="font-semibold text-[#444] font-mono-data">{test.spec}</span>
                </div>
                <LinkButton href={`/samples/${sample.id}/tests/${test.id}`} size="sm">
                  Enter result
                </LinkButton>
              </div>
            )}

            {test.attachments.length > 0 && (
              <div className="px-[15px] py-3 border-t border-border-soft flex flex-col gap-1.5">
                <div className="text-[11px] text-faint tracking-wide uppercase font-semibold">
                  Attachments ({test.attachments.length})
                </div>
                <AttachmentGallery attachments={test.attachments} canDownloadDocs={canDownloadDocs} />
              </div>
            )}
          </div>
        );
      })}

      {status === "Awaiting Supervisor Review" && (
        <ReviewPanel
          title="Supervisor Review"
          body="All results are in. Endorse for QA approval or reject to request recollection."
          canAct={actions.canReviewAsSupervisor}
          approveAction={actions.supervisorApproveAction}
          rejectAction={actions.supervisorRejectAction}
          approveLabel="Endorse"
        />
      )}

      {status === "Awaiting QA Approval" && (
        <ReviewPanel
          title="QA Approval"
          body="Endorsed by supervisor. Approve for release or reject to request recollection."
          canAct={actions.canApproveAsQa}
          approveAction={actions.qaApproveAction}
          rejectAction={actions.qaRejectAction}
          approveLabel="Approve"
        />
      )}

      {openDeviation && (
        <div className="flex flex-col gap-1.5 bg-danger-bg border border-danger/30 rounded-[18px] md:rounded-2xl p-4">
          <div className="text-[13px] font-semibold text-danger">Open Deviation</div>
          <div className="text-xs text-danger">{openDeviation.description}</div>
          <Link href="/deviations" className="text-xs font-semibold text-danger underline mt-1">
            Manage in Deviations →
          </Link>
        </div>
      )}

      {status === "Rejected" && sample.retests.length === 0 && (
        <form action={actions.retestSampleAction}>
          <Button>Request Retest</Button>
        </form>
      )}

      {sample.retests.length > 0 && (
        <div className="flex flex-col gap-2">
          <SectionLabel>Retests</SectionLabel>
          {sample.retests.map((r) => (
            <Link
              key={r.id}
              href={`/samples/${r.id}`}
              className="flex items-center justify-between bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card p-3.5"
            >
              <span className="text-[13px] font-semibold text-text font-mono-data">{r.id}</span>
              <StatusBadge status={r.status} />
            </Link>
          ))}
        </div>
      )}

      {status === "Complete" && (
        <LinkButton href={`/samples/${sample.id}/certificate`} variant="secondary">
          View Certificate of Analysis
        </LinkButton>
      )}
    </>
  );

  const detailsContent = (
    <>
      {(status === "Pending Login" || status === "In Testing") && (
        <LinkButton href={`/samples/${sample.id}/edit`} variant="secondary" size="sm">
          Edit Sample
        </LinkButton>
      )}

      <div className="bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card overflow-hidden">
        <InfoRow label="Sample type" value={sample.type} />
        <InfoRow label="Source" value={sample.source} />
        <InfoRow label="Requestor" value={sample.requestorName || "Not set"} />
        <InfoRow label="Business unit" value={sample.businessUnit?.name || "Not set"} />
        <InfoRow label="Priority" value={sample.priority} />
        <InfoRow label="Collected by" value={sample.collectedBy} />
        <InfoRow label="Collected" value={formatDateTime(sample.collectedDate)} />
        <InfoRow label="Received" value={formatDateTime(sample.receivedDate)} />
        <InfoRow label="Container" value={sample.container} />
        <InfoRow label="Target TAT" value={`${targetHours}h (due ${formatDateTime(dueAt)})`} />
        {sample.retentionUntil && <InfoRow label="Retain until" value={formatDateTime(sample.retentionUntil)} />}
        <InfoRow label="Storage location" value={sample.storageLocation || "Not set"} last />
      </div>

      <div className="bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card p-[15px] flex flex-col gap-3">
        <SectionLabel>Storage & handling</SectionLabel>
        <StorageLocationForm sampleId={sample.id} currentLocation={sample.storageLocation} />
        <div className="flex gap-2.5">
          <LinkButton href={`/samples/${sample.id}/label`} variant="secondary" size="sm">
            Print Barcode Label
          </LinkButton>
          {status === "Complete" && !sample.disposedAt && (
            <form action={actions.markDisposedAction} className="flex-1">
              <Button variant="secondary" size="sm">
                Mark Disposed
              </Button>
            </form>
          )}
        </div>
        {sample.disposedAt && <div className="text-xs text-muted">Disposed {formatDateTime(sample.disposedAt)}</div>}
      </div>

      <NfcTagPanel entityType="SAMPLE" entityId={sample.id} activeTag={activeNfcTag} />

      {trackingUrl && accessCodeFormatted && (
        <TrackingLinkCard
          trackingUrl={trackingUrl}
          accessCodeFormatted={accessCodeFormatted}
          sampleId={sample.id}
          sampleName={sample.name}
        />
      )}
    </>
  );

  const custodyContent = (
    <div className="bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card px-4 pt-4 pb-1">
      {sample.custodyEvents.map((step, i) => {
        const isLast = i === sample.custodyEvents.length - 1;
        return (
          <div key={step.id} className="flex gap-3">
            <div className="flex flex-col items-center w-3 shrink-0">
              <div
                className="w-3 h-3 rounded-full shrink-0 mt-0.5 box-content"
                style={{ background: isLast ? lastDotColor : "#2B8DB8", border: "2.5px solid #E8F4FA" }}
              />
              {!isLast && <div className="w-[2px] flex-1 bg-border-soft" />}
            </div>
            <div className="pb-5 flex-1 min-w-0">
              <div className="text-sm font-semibold text-text leading-snug">{step.label}</div>
              <div className="text-xs text-muted mt-0.5">{formatDateTime(step.time)}</div>
              {step.detail && <div className="text-xs text-faint mt-0.5">{step.detail}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={role} userName={userName} unreadCount={unreadCount} />

      <div className="sticky top-0 bg-white border-b border-border-soft z-10">
        <div className="flex items-center gap-2.5 px-3.5 pt-6 pb-2.5 md:px-8 md:pt-8 md:max-w-[1280px] md:mx-auto md:w-full">
          <Link
            href="/samples"
            className="w-10 h-10 rounded-full bg-page-bg flex items-center justify-center shrink-0"
            aria-label="Back"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#1A5F7A" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-text font-mono-data tracking-tight">{sample.id}</div>
            <div className="text-xs text-muted mt-px truncate">{sample.name || sample.type}</div>
          </div>
          <span
            className="text-[11px] font-semibold px-2.5 py-1.5 rounded-full whitespace-nowrap shrink-0"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {sample.status}
          </span>
        </div>
        <div className="md:hidden flex gap-[3px] mx-3.5 mb-3 p-[3px] bg-[#EFF5F8] rounded-[13px]">
          {TABS.map((t) => {
            const active = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="flex-1 text-center text-[13px] font-semibold py-2.5 px-1 rounded-[10px] cursor-pointer transition-colors"
                style={{
                  color: active ? "#1A5F7A" : "#7A8B94",
                  background: active ? "#FFFFFF" : "transparent",
                  boxShadow: active ? "0 1px 2px rgba(16,42,58,0.08)" : "none",
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
        {(isOverdue || sample.retestOf) && (
          <div className="flex items-center gap-2 flex-wrap px-3.5 pb-3 md:px-8 md:max-w-[1280px] md:mx-auto md:w-full">
            {isOverdue && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-danger-bg text-danger">
                Overdue — due {formatDateTime(dueAt)}
              </span>
            )}
            {sample.retestOf && (
              <Link
                href={`/samples/${sample.retestOf.id}`}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-chip-bg text-primary"
              >
                Retest of {sample.retestOf.id}
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Mobile: one tab's content at a time */}
      <div key={tab} className="md:hidden fade-in flex-1 px-5 py-4 flex flex-col gap-3.5">
        {tab === "Results" && resultsContent}
        {tab === "Details" && detailsContent}
        {tab === "Custody" && custodyContent}
      </div>

      {/* Desktop: everything visible at once, split into a metadata rail + a results column */}
      <div className="hidden md:grid md:grid-cols-[360px_1fr] md:items-start md:gap-5 md:px-8 md:py-6 md:max-w-[1280px] md:mx-auto md:w-full flex-1">
        <div className="flex flex-col gap-3.5">
          {detailsContent}
          <SectionLabel className="mt-1">Custody</SectionLabel>
          {custodyContent}
        </div>
        <div className="flex flex-col gap-3.5">{resultsContent}</div>
      </div>
    </div>
  );
}

function whatsappShareHref(sampleId: string, sampleName: string | null, trackingUrl: string, accessCodeFormatted: string) {
  const lines = [
    `Hi, here is the tracking link for your sample at Zekindo Chemicals Lab:`,
    ``,
    `Sample: ${sampleName ? `${sampleName} (${sampleId})` : sampleId}`,
    `Access Code: ${accessCodeFormatted}`,
    `Track here: ${trackingUrl}`,
  ];
  return `https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`;
}

function WhatsAppIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
      <path d="M12.02 2C6.5 2 2 6.48 2 12c0 1.85.5 3.58 1.36 5.07L2 22l5.08-1.33A9.96 9.96 0 0012.02 22C17.54 22 22 17.52 22 12S17.54 2 12.02 2zm0 18.13a8.1 8.1 0 01-4.14-1.14l-.3-.18-3.02.79.8-2.94-.19-.3a8.1 8.1 0 01-1.24-4.32c0-4.48 3.65-8.13 8.13-8.13 4.48 0 8.13 3.65 8.13 8.13 0 4.49-3.65 8.09-8.17 8.09zm4.44-6.08c-.24-.12-1.44-.71-1.67-.79-.22-.08-.38-.12-.55.12-.16.24-.63.79-.77.95-.14.16-.28.18-.52.06-.24-.12-1.02-.38-1.94-1.2-.72-.64-1.2-1.44-1.35-1.68-.14-.24-.02-.37.11-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.55-1.32-.75-1.81-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.42.06-.64.3-.22.24-.84.82-.84 2s.86 2.32.98 2.48c.12.16 1.7 2.6 4.13 3.64.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.44-.59 1.64-1.16.2-.57.2-1.06.14-1.16-.06-.1-.22-.16-.46-.28z" />
    </svg>
  );
}

function TrackingLinkCard({
  trackingUrl,
  accessCodeFormatted,
  sampleId,
  sampleName,
}: {
  trackingUrl: string;
  accessCodeFormatted: string;
  sampleId: string;
  sampleName: string | null;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="bg-white border border-border rounded-[18px] md:rounded-2xl shadow-card p-[15px] flex flex-col gap-3">
      <SectionLabel>Requestor tracking</SectionLabel>
      <p className="text-xs text-muted -mt-1">
        Share the Sample ID and this Access Code with the requestor so they can check status externally, without a login.
      </p>
      <div className="flex items-center justify-between gap-2 bg-page-bg border border-border-soft rounded-[13px] px-3.5 py-3">
        <span className="text-sm font-bold text-text font-mono-data tracking-wide">{accessCodeFormatted}</span>
        <span className="text-[11px] text-faint">Access Code</span>
      </div>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(trackingUrl).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="text-[13px] font-semibold text-primary cursor-pointer text-left"
        >
          {copied ? "Link copied ✓" : "Copy tracking link"}
        </button>
        <a
          href={whatsappShareHref(sampleId, sampleName, trackingUrl, accessCodeFormatted)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#25D366]"
        >
          <WhatsAppIcon />
          Share via WhatsApp
        </a>
      </div>
    </div>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between gap-3.5 px-[15px] py-3 ${last ? "" : "border-b border-border-soft"}`}>
      <span className="text-[13px] text-muted shrink-0">{label}</span>
      <span className="text-[13px] font-semibold text-text text-right leading-snug">{value}</span>
    </div>
  );
}
