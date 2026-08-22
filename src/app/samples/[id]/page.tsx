import { notFound } from "next/navigation";
import Link from "next/link";
import { getSampleDetail } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import { CUSTODY_DOT_COLOR, SampleStatus, TEST_STATUS_STYLES } from "@/lib/status";
import StatusBadge from "@/components/StatusBadge";
import BackHeader from "@/components/BackHeader";
import { approveSampleAction, rejectSampleAction } from "@/lib/actions/samples";

export default async function SampleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sample = await getSampleDetail(id);
  if (!sample) notFound();

  const status = sample.status as SampleStatus;
  const lastDotColor = CUSTODY_DOT_COLOR[status] ?? "#2B8DB8";

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BackHeader title={sample.id} backHref="/samples" />

      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-5">
        <div>
          <div className="text-base font-semibold text-text mb-1.5">{sample.type}</div>
          <div className="text-[13px] text-muted mb-2.5">{sample.source}</div>
          <StatusBadge status={sample.status} />
        </div>

        <div className="bg-surface border border-border-soft rounded-xl p-4">
          <div className="text-[11px] font-semibold text-muted tracking-wider uppercase mb-2.5">
            Sample Information
          </div>
          <Row label="Collected By" value={sample.collectedBy} />
          <Row label="Collected" value={formatDateTime(sample.collectedDate)} />
          <Row label="Received" value={formatDateTime(sample.receivedDate)} />
          <Row label="Container" value={sample.container} last />
        </div>

        <div>
          <div className="text-[11px] font-semibold text-muted tracking-wider uppercase mb-2.5">
            Chain of Custody
          </div>
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
          <div className="text-[11px] font-semibold text-muted tracking-wider uppercase mb-2.5">
            Tests Requested
          </div>
          <div className="flex flex-col gap-2">
            {sample.tests.map((test) => {
              const st = TEST_STATUS_STYLES[test.status as keyof typeof TEST_STATUS_STYLES];
              return (
                <div key={test.id} className="bg-white border border-border rounded-xl p-3.5">
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div className="text-[13px] font-semibold text-text flex-1">{test.name}</div>
                    <span
                      className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
                      style={{ background: st.bg, color: st.color }}
                    >
                      {st.label}
                    </span>
                  </div>
                  {test.status === "pending" && (
                    <Link
                      href={`/samples/${sample.id}/tests/${test.id}`}
                      className="block text-center w-full bg-surface-alt text-primary rounded-full py-2.5 text-xs font-semibold"
                    >
                      Enter Result
                    </Link>
                  )}
                  {test.status === "awaiting" && (
                    <div className="text-xs text-muted">
                      Result <strong className="text-text">{test.result} {test.unit}</strong> submitted — pending QA review.
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
                </div>
              );
            })}
          </div>
        </div>

        {status === "Awaiting Approval" && (
          <div className="flex flex-col gap-2.5 bg-warning-bg border border-[#F5A623] rounded-xl p-4">
            <div className="text-[13px] font-semibold text-[#a36a00]">QA Review</div>
            <div className="text-xs text-[#a36a00]">
              All results are in. Approve for release or reject to request recollection.
            </div>
            <div className="flex gap-2.5">
              <form action={rejectSampleAction.bind(null, sample.id)} className="flex-1">
                <button
                  type="submit"
                  className="w-full bg-white text-danger border border-danger rounded-full py-3 text-[13px] font-semibold cursor-pointer"
                >
                  Reject
                </button>
              </form>
              <form action={approveSampleAction.bind(null, sample.id)} className="flex-1">
                <button
                  type="submit"
                  className="w-full bg-success text-white rounded-full py-3 text-[13px] font-semibold cursor-pointer"
                >
                  Approve
                </button>
              </form>
            </div>
          </div>
        )}

        {status === "Complete" && (
          <Link
            href={`/samples/${sample.id}/certificate`}
            className="block text-center bg-primary text-white rounded-full py-3.5 text-[15px] font-semibold"
          >
            View Certificate of Analysis
          </Link>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-1.5 ${last ? "" : "border-b border-border-soft"}`}>
      <span className="text-xs text-muted">{label}</span>
      <span className="text-xs font-semibold text-text">{value}</span>
    </div>
  );
}
