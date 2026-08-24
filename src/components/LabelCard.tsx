import Image from "next/image";

export default function LabelCard({
  qrDataUrl,
  code,
  title,
  lines,
}: {
  qrDataUrl: string;
  code: string;
  title?: string | null;
  lines?: (string | null)[];
}) {
  return (
    <div className="label-card w-full max-w-[280px] border-2 border-text rounded-xl p-4 flex flex-col items-center gap-2.5 text-center">
      <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={90} height={30} style={{ height: 20, width: "auto" }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={qrDataUrl} alt={`QR code for ${code}`} width={180} height={180} />
      <div className="text-lg font-bold text-text tracking-wide">{code}</div>
      {title && <div className="text-sm font-semibold text-text">{title}</div>}
      {lines?.filter(Boolean).map((line) => (
        <div key={line} className="text-[11px] text-muted">
          {line}
        </div>
      ))}
    </div>
  );
}
