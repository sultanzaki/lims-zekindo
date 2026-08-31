import Image from "next/image";
import { formatDate, formatDateTime } from "@/lib/format";
import { parseSpecVerdict } from "@/lib/spec";
import type { getSampleDetail } from "@/lib/data";

type SampleDetail = NonNullable<Awaited<ReturnType<typeof getSampleDetail>>>;

export default function CertificateDocument({ sample, qrDataUrl }: { sample: SampleDetail; qrDataUrl: string }) {
  const certificateNo = `COA-${sample.id}`;
  const reviewEvent = sample.custodyEvents.find((e) => /^Supervisor Reviewed \(/.test(e.label));
  const reviewedByName = reviewEvent?.label.match(/^Supervisor Reviewed \((.+)\)$/)?.[1] ?? null;
  const [approvedName, approvedTitle] = (sample.approvedBy ?? "").split(",").map((s) => s.trim());

  return (
    <div className="coa-page w-[210mm] shrink-0 min-h-[297mm] bg-white shadow-[0_1px_16px_rgba(20,24,28,0.08)] my-5 print:my-0 px-[14mm] py-[12mm] flex flex-col text-[#1a1d21]">
      {/* Letterhead */}
      <div className="flex items-start justify-between gap-4 pb-3 border-b-[2px] border-text">
        <div className="flex items-center gap-3">
          <Image src="/zekindo-logo.png" alt="lab logo" width={90} height={30} style={{ height: 30, width: "auto" }} />
          <div className="text-[13px] font-bold tracking-tight">Zekindo Chemicals</div>
        </div>
        <div className="text-right text-[10px] text-muted leading-relaxed shrink-0">
          <div>Certificate No.</div>
          <div className="font-semibold text-text tracking-wide">{certificateNo}</div>
        </div>
      </div>

      <div className="text-center mt-4 mb-4">
        <div className="text-[17px] font-bold tracking-wide uppercase">Certificate of Analysis</div>
      </div>

      {sample.name && <div className="text-center text-[13px] font-semibold mb-3">{sample.name}</div>}

      {/* Sample & testing info */}
      <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[11px] mb-5">
        <InfoRow label="Sample ID" value={sample.id} />
        <InfoRow label="Received" value={formatDateTime(sample.receivedDate)} />
        <InfoRow label="Sample Type" value={sample.type} />
        <InfoRow label="Reported" value={sample.approvedAt ? formatDateTime(sample.approvedAt) : "—"} />
        <InfoRow label="Source" value={sample.source} />
        <InfoRow label="Collected By" value={sample.collectedBy} />
        <InfoRow label="Requestor" value={sample.requestorName || "—"} />
        <InfoRow label="Business Unit" value={sample.businessUnit?.name || "—"} />
        <InfoRow label="Container" value={sample.container} />
        <InfoRow label="Collected" value={formatDateTime(sample.collectedDate)} />
      </div>

      {/* Results table */}
      <table className="w-full border-collapse text-[11px] mb-5">
        <thead>
          <tr className="border-y-[1.5px] border-text">
            <th className="text-left font-bold uppercase tracking-wide py-1.5 pr-2">Parameter</th>
            <th className="text-left font-bold uppercase tracking-wide py-1.5 pr-2">Specification</th>
            <th className="text-right font-bold uppercase tracking-wide py-1.5 pr-2">Result</th>
            <th className="text-right font-bold uppercase tracking-wide py-1.5">Verdict</th>
          </tr>
        </thead>
        <tbody>
          {sample.tests.map((test) => {
            const verdict = parseSpecVerdict(test.spec, test.result);
            return (
              <tr key={test.id} className="border-b border-border-soft break-inside-avoid">
                <td className="py-1.5 pr-2 font-medium">{test.name}</td>
                <td className="py-1.5 pr-2 text-muted">{test.spec}</td>
                <td className="py-1.5 pr-2 text-right font-semibold whitespace-nowrap">
                  {test.result} {test.unit}
                </td>
                <td
                  className="py-1.5 text-right font-bold whitespace-nowrap"
                  style={{ color: verdict === "Fail" ? "var(--color-danger)" : verdict === "Pass" ? "var(--color-success-dark)" : undefined }}
                >
                  {verdict ?? "—"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="border-[1.5px] border-success text-success-dark text-center text-[12px] font-bold tracking-wide uppercase py-2 mb-6 break-inside-avoid">
        Approved for Release
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 mt-auto text-[10px] break-inside-avoid">
        <SignatureBlock
          role="Reviewed By"
          name={reviewedByName}
          title={sample.reviewedByRole ?? undefined}
          date={reviewEvent ? formatDate(reviewEvent.time) : null}
        />
        <SignatureBlock role="Approved By" name={approvedName} title={approvedTitle} date={sample.approvedAt ? formatDate(sample.approvedAt) : null} />
      </div>

      {/* Footer */}
      <div className="flex items-end justify-between gap-4 mt-6 pt-3 border-t border-border-soft">
        <div className="text-[8.5px] text-faint leading-relaxed max-w-[120mm]">
          This certificate relates only to the sample(s) identified above and shall not be reproduced except in full,
          without the written approval of the laboratory. Generated {formatDateTime(new Date())}.
          <br />
          Powered by Product Specialist Microbiology.
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt="Verification code" width={52} height={52} className="shrink-0" />
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-border-soft py-1">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-text text-right">{value}</span>
    </div>
  );
}

function SignatureBlock({
  role,
  name,
  title,
  date,
}: {
  role: string;
  name: string | null;
  title?: string;
  date: string | null;
}) {
  return (
    <div className="flex flex-col">
      <div className="text-muted uppercase tracking-wide font-semibold mb-6">{role}</div>
      <div className="border-t border-text pt-1.5 flex flex-col gap-0.5">
        <div className="font-semibold text-text text-[11px]">{name ?? "—"}</div>
        {title && <div className="text-muted">{title}</div>}
        <div className="text-muted">{date ?? "—"}</div>
      </div>
    </div>
  );
}
