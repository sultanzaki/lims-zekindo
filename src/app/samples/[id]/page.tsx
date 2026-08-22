import { notFound } from "next/navigation";
import Link from "next/link";
import { getSampleDetail } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { formatDateTime } from "@/lib/format";
import { CUSTODY_DOT_COLOR, SampleStatus, TEST_STATUS_STYLES } from "@/lib/status";
import { canReviewAsSupervisor, canApproveAsQa } from "@/lib/roles";
import StatusBadge from "@/components/StatusBadge";
import BackHeader from "@/components/BackHeader";
import {
  supervisorApproveAction,
  supervisorRejectAction,
  qaApproveAction,
  qaRejectAction,
  retestSampleAction,
  markDisposedAction,
} from "@/lib/actions/samples";
import StorageLocationForm from "@/components/StorageLocationForm";
import ReviewPanel from "@/components/ReviewPanel";
import Card from "@/components/ui/Card";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";
import LinkButton from "@/components/ui/LinkButton";

export default async function SampleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [sample, user] = await Promise.all([getSampleDetail(id), getCurrentUser()]);
  if (!sample || !user) notFound();

  const status = sample.status as SampleStatus;
  const lastDotColor = CUSTODY_DOT_COLOR[status] ?? "#2B8DB8";

  const targetHours = sample.sampleType?.targetTatHours ?? 48;
  const dueAt = new Date(sample.receivedDate.getTime() + targetHours * 60 * 60 * 1000);
  const isOpenStatus = !["Complete", "Rejected"].includes(status);
  const isOverdue = isOpenStatus && dueAt.getTime() < new Date().getTime();

  const openDeviation = sample.deviations.find((d) => d.status !== "Closed");

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BackHeader title={sample.id} backHref="/samples" />

      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-5">
        <div>
          <div className="text-[17px] font-semibold text-text mb-1 tracking-tight">{sample.type}</div>
          <div className="text-[13px] text-muted mb-2.5">{sample.source}</div>
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={sample.status} />
            {isOverdue && (
              <span className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-danger-bg text-danger">
                Overdue (due {formatDateTime(dueAt)})
              </span>
            )}
            {sample.retestOf && (
              <Link
                href={`/samples/${sample.retestOf.id}`}
                className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px] bg-chip-bg text-primary"
              >
                Retest of {sample.retestOf.id}
              </Link>
            )}
          </div>
        </div>

        <Card className="bg-surface">
          <SectionLabel className="mb-2.5">Sample Information</SectionLabel>
          <Row label="Collected By" value={sample.collectedBy} />
          <Row label="Collected" value={formatDateTime(sample.collectedDate)} />
          <Row label="Received" value={formatDateTime(sample.receivedDate)} />
          <Row label="Container" value={sample.container} />
          <Row label="Target TAT" value={`${targetHours}h (due ${formatDateTime(dueAt)})`} />
          {sample.retentionUntil && <Row label="Retain Until" value={formatDateTime(sample.retentionUntil)} />}
          <Row label="Storage Location" value={sample.storageLocation || "Not set"} last />
        </Card>

        <StorageLocationForm sampleId={sample.id} currentLocation={sample.storageLocation} />

        <div className="flex gap-2.5">
          <LinkButton href={`/samples/${sample.id}/label`} variant="secondary" size="sm">
            Print Barcode Label
          </LinkButton>
          {status === "Complete" && !sample.disposedAt && (
            <form action={markDisposedAction.bind(null, sample.id)} className="flex-1">
              <Button variant="secondary" size="sm">
                Mark Disposed
              </Button>
            </form>
          )}
        </div>
        {sample.disposedAt && (
          <div className="text-xs text-muted -mt-3">Disposed {formatDateTime(sample.disposedAt)}</div>
        )}

        <div>
          <SectionLabel className="mb-2.5">Chain of Custody</SectionLabel>
          <div className="flex flex-col">
            {sample.custodyEvents.map((step, i) => {
              const isLast = i === sample.custodyEvents.length - 1;
              return (
                <div key={step.id} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5"
                      style={{ background: isLast ? lastDotColor : "#2B8DB8" }}
                    />
                    {!isLast && <div className="w-[1.5px] flex-1 bg-border-soft" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-[13px] font-semibold text-text">{step.label}</div>
                    <div className="text-[11px] text-muted mt-0.5">{formatDateTime(step.time)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <SectionLabel className="mb-2.5">Tests Requested</SectionLabel>
          <div className="flex flex-col gap-2">
            {sample.tests.map((test) => {
              const st = TEST_STATUS_STYLES[test.status as keyof typeof TEST_STATUS_STYLES];
              return (
                <Card key={test.id}>
                  <div className="flex justify-between items-start gap-2 mb-2.5">
                    <div className="text-[13px] font-semibold text-text flex-1">{test.name}</div>
                    <span
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px] whitespace-nowrap shrink-0"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                  {test.status === "pending" && (
                    <LinkButton href={`/samples/${sample.id}/tests/${test.id}`} variant="secondary" size="sm">
                      Enter Result
                    </LinkButton>
                  )}
                  {test.status === "awaiting" && (
                    <div className="text-xs text-muted">
                      Result <strong className="text-text">{test.result} {test.unit}</strong> submitted — pending review.
                    </div>
                  )}
                  {test.status === "complete" && (
                    <div className="flex justify-between text-xs text-[#444]">
                      <span>
                        Result: <strong className="text-text">{test.result} {test.unit}</strong>
                      </span>
                      <span>Spec: {test.spec}</span>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {status === "Awaiting Supervisor Review" && (
          <ReviewPanel
            title="Supervisor Review"
            body="All results are in. Endorse for QA approval or reject to request recollection."
            canAct={canReviewAsSupervisor(user.accessRole)}
            approveAction={supervisorApproveAction.bind(null, sample.id)}
            rejectAction={supervisorRejectAction.bind(null, sample.id)}
            approveLabel="Endorse"
          />
        )}

        {status === "Awaiting QA Approval" && (
          <ReviewPanel
            title="QA Approval"
            body="Endorsed by supervisor. Approve for release or reject to request recollection."
            canAct={canApproveAsQa(user.accessRole)}
            approveAction={qaApproveAction.bind(null, sample.id)}
            rejectAction={qaRejectAction.bind(null, sample.id)}
            approveLabel="Approve"
          />
        )}

        {openDeviation && (
          <div className="flex flex-col gap-1.5 bg-danger-bg border border-danger/30 rounded-xl p-4">
            <div className="text-[13px] font-semibold text-danger">Open Deviation</div>
            <div className="text-xs text-danger">{openDeviation.description}</div>
            <Link href="/deviations" className="text-xs font-semibold text-danger underline mt-1">
              Manage in Deviations →
            </Link>
          </div>
        )}

        {status === "Rejected" && sample.retests.length === 0 && (
          <form action={retestSampleAction.bind(null, sample.id)}>
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
                className="flex items-center justify-between bg-white border border-border rounded-xl p-3"
              >
                <span className="text-[13px] font-semibold text-text">{r.id}</span>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        )}

        {status === "Complete" && (
          <LinkButton href={`/samples/${sample.id}/certificate`}>View Certificate of Analysis</LinkButton>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 gap-3 ${last ? "" : "border-b border-border-soft"}`}>
      <span className="text-xs text-muted shrink-0">{label}</span>
      <span className="text-xs font-semibold text-text text-right">{value}</span>
    </div>
  );
}
