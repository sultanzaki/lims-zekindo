import { notFound } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { getSampleDetail } from "@/lib/data";
import { certificateVerificationUrl } from "@/lib/tracking";
import BackHeader from "@/components/BackHeader";
import PrintButton from "@/components/PrintButton";
import CertificateDocument from "@/components/CertificateDocument";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Certificate of Analysis" };

export default async function CertificatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sample = await getSampleDetail(id);
  if (!sample || sample.status !== "Complete") notFound();

  const h = await headers();
  const host = h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  const verifyUrl = sample.accessCode && host
    ? certificateVerificationUrl(`${proto}://${host}`, sample.id, sample.accessCode)
    : null;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl ?? `COA-${sample.id}`, { margin: 0, width: 200 });

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
