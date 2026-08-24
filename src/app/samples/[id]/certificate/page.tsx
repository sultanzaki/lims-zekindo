import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { getSampleDetail } from "@/lib/data";
import BackHeader from "@/components/BackHeader";
import PrintButton from "@/components/PrintButton";
import CertificateDocument from "@/components/CertificateDocument";

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sample = await getSampleDetail(id);
  if (!sample || sample.status !== "Complete") notFound();

  const certificateNo = `COA-${sample.id}`;
  const qrDataUrl = await QRCode.toDataURL(
    `${certificateNo} | ${sample.approvedAt ? sample.approvedAt.toISOString() : ""} | ${sample.approvedBy ?? ""}`,
    { margin: 0, width: 200 }
  );

  return (
    <div className="min-h-screen print:min-h-0 flex flex-col items-center bg-page-bg print:bg-white print:block">
      <div className="no-print w-full">
        <BackHeader title="Certificate of Analysis" backHref={`/samples/${id}`} />
      </div>

      <div className="coa-zoom-wrap w-full flex justify-center overflow-hidden print:overflow-visible">
        <CertificateDocument sample={sample} qrDataUrl={qrDataUrl} />
      </div>

      <div className="no-print w-full max-w-[210mm] px-5 pb-7">
        <PrintButton />
      </div>
    </div>
  );
}
