import { notFound } from "next/navigation";
import Image from "next/image";
import { getSampleDetail } from "@/lib/data";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import PrintButton from "@/components/PrintButton";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sample = await getSampleDetail(id);
  if (!sample || sample.status !== "Complete") notFound();

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <div className="no-print">
        <BackHeader title="Certificate of Analysis" backHref={`/samples/${id}`} />
      </div>

      <div className="flex-1 px-5 pt-5 pb-7 flex flex-col gap-4.5">
        <div className="flex flex-col items-center gap-1.5 text-center pb-2 border-b-[1.5px] border-text">
          <Image src="/zekindo-logo.png" alt="lab logo" width={120} height={24} style={{ height: 24, width: "auto" }} className="mb-1" />
          <div className="text-[15px] font-bold text-text">Certificate of Analysis</div>
          <div className="text-[11px] text-muted">Microbiology Section · General Testing Laboratory</div>
        </div>

        <div className="flex flex-col gap-1.5">
          <CertRow label="Sample ID" value={sample.id} />
          <CertRow label="Sample Type" value={sample.type} />
          <CertRow label="Source" value={sample.source} />
          <CertRow label="Collected" value={formatDateTime(sample.collectedDate)} />
        </div>

        <div>
          <div className="text-[11px] font-semibold text-muted tracking-wider uppercase mb-2">Results</div>
          {sample.tests.map((test) => (
            <div key={test.id} className="border-t border-border-soft py-2.5">
              <div className="text-[13px] font-semibold text-text mb-1">{test.name}</div>
              <div className="flex justify-between text-xs text-[#444]">
                <span>
                  Result: <strong className="text-text">{test.result} {test.unit}</strong>
                </span>
                <span>Spec: {test.spec}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-success-bg border border-success rounded-[10px] p-3 text-center text-[13px] font-semibold text-success-dark">
          Approved for Release
        </div>

        <div className="flex flex-col gap-1 mt-1.5">
          <CertRow label="Approved By" value={sample.approvedBy ?? "—"} />
          <CertRow label="Approval Date" value={sample.approvedAt ? formatDateTime(sample.approvedAt) : "—"} />
        </div>

        <div className="no-print">
          <PrintButton />
        </div>
      </div>
    </div>
  );
}

function CertRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-text">{value}</span>
    </div>
  );
}
