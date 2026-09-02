import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { getSampleDetail } from "@/lib/data";
import { verifyTrackingAccess, certificateVerificationUrl } from "@/lib/tracking";
import PrintButton from "@/components/PrintButton";
import CertificateDocument from "@/components/CertificateDocument";

export default async function PublicCertificatePage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; code?: string }>;
}) {
  const { id, code } = await searchParams;
  if (!id || !code) notFound();

  const verifiedId = await verifyTrackingAccess(id, code);
  if (!verifiedId) notFound();

  const sample = await getSampleDetail(verifiedId);
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
      <div className="no-print w-full sticky top-0 bg-white border-b border-border flex items-center gap-3 px-4 py-3.5 z-10">
        <Link
          href={`/track?id=${sample.id}&code=${code}`}
          className="w-10 h-10 rounded-full bg-chip-bg border border-border flex items-center justify-center shrink-0"
          aria-label="Back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A5F7A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </Link>
        <div className="text-[16px] font-bold text-text tracking-tight">Certificate of Analysis</div>
      </div>

      <div className="no-print w-full max-w-[210mm] px-5 pt-4">
        <div className="flex items-center gap-3 bg-success-bg border border-success/30 rounded-2xl px-4 py-3">
          <div className="w-9 h-9 rounded-full bg-success flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <div>
            <div className="text-sm font-bold text-success-dark leading-tight">Verified — Authentic Certificate</div>
            <div className="text-xs text-muted mt-0.5 leading-snug">
              This Certificate of Analysis matches Zekindo Chemicals&apos; records for sample {sample.id}. Compare it
              against your printed copy — any mismatch means the copy has been altered.
            </div>
          </div>
        </div>
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
