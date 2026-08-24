import Image from "next/image";

export type LabelField = { label: string; value: string | null | undefined };

// A technical, information-dense label in the style of a formal lab/asset
// tag — QR + primary ID up front, then a compact key/value spec block, not
// a big centered "product label" look. Every field that helps someone
// identify the item without opening the app belongs here.
export default function LabelCard({
  qrDataUrl,
  code,
  docType,
  title,
  fields,
  printedAt,
}: {
  qrDataUrl: string;
  code: string;
  docType: string;
  title?: string | null;
  fields: LabelField[];
  printedAt: string;
}) {
  const rows = fields.filter((f): f is { label: string; value: string } => Boolean(f.value));

  return (
    <div className="label-card w-full max-w-[320px] border-2 border-text bg-white text-left overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b-2 border-text bg-[#F4F7F9]">
        <div className="flex items-center gap-1.5">
          <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={60} height={20} style={{ height: 13, width: "auto" }} />
          <span className="text-[7.5px] font-bold uppercase tracking-[0.08em] text-faint">Laboratory</span>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-muted">{docType}</span>
      </div>

      <div className="flex gap-2.5 p-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code for ${code}`} width={84} height={84} className="border border-border-soft shrink-0" />

        <div className="flex-1 min-w-0 flex flex-col">
          <div className="text-[15px] font-bold text-text font-mono-data leading-none tracking-tight truncate">{code}</div>
          {title && <div className="text-[10.5px] font-semibold text-text leading-snug mt-1 truncate">{title}</div>}

          <div className="mt-1.5 flex flex-col">
            {rows.map((f, i) => (
              <div
                key={f.label}
                className={`flex items-baseline justify-between gap-2 py-[3px] ${i > 0 ? "border-t border-dotted border-border-soft" : ""}`}
              >
                <span className="text-[8px] font-semibold uppercase tracking-[0.06em] text-faint shrink-0">{f.label}</span>
                <span className="text-[9.5px] font-semibold font-mono-data text-text text-right truncate">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-2.5 py-1 border-t-2 border-text">
        <span className="text-[7px] text-faint tracking-wide">PRINTED {printedAt}</span>
        <span className="text-[7px] font-mono-data font-semibold text-faint tracking-[0.1em] truncate">{code}</span>
      </div>
    </div>
  );
}
