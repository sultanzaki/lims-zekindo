import Image from "next/image";

export type LabelField = { label: string; value: string | null | undefined };
export type LabelSize = "small" | "medium" | "large";

// A technical, information-dense label in the style of a formal lab/asset
// tag — QR + primary ID up front, then a compact key/value spec block, not
// a big centered "product label" look. Every field that helps someone
// identify the item without opening the app belongs here.
//
// Three physical sizes for real label stock: "small" (5x2cm — just enough
// for a QR and the ID, for tiny sample vials), "medium" (10x4cm — QR, ID,
// and the two or three fields that matter most), "large" (the original
// unconstrained design, printed on a normal A4 sheet). Each size maps to
// a named @page rule in globals.css so print output comes out at the
// actual physical dimension, not just a scaled-down version of the big one.
export default function LabelCard({
  qrDataUrl,
  code,
  docType,
  title,
  fields,
  printedAt,
  size = "large",
}: {
  qrDataUrl: string;
  code: string;
  docType: string;
  title?: string | null;
  fields: LabelField[];
  printedAt: string;
  size?: LabelSize;
}) {
  const rows = fields.filter((f): f is { label: string; value: string } => Boolean(f.value));

  if (size === "small") {
    return (
      <div
        className="label-card border-2 border-text bg-white overflow-hidden flex items-center gap-[2mm] p-[2mm] shrink-0"
        data-size="small"
        style={{ width: "50mm", height: "20mm" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrDataUrl} alt={`QR code for ${code}`} className="shrink-0 border border-border-soft" style={{ width: "16mm", height: "16mm" }} />
        <div className="min-w-0 flex-1 flex flex-col justify-center overflow-hidden">
          <div className="font-bold text-text font-mono-data leading-none tracking-tight truncate" style={{ fontSize: "4.2mm" }}>
            {code}
          </div>
          {title && (
            <div className="text-faint leading-tight truncate mt-[1mm]" style={{ fontSize: "2.2mm" }}>
              {title}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (size === "medium") {
    const mediumRows = rows.slice(0, 3);
    return (
      <div
        className="label-card border-2 border-text bg-white overflow-hidden flex flex-col shrink-0"
        data-size="medium"
        style={{ width: "100mm", height: "40mm" }}
      >
        <div className="flex items-center justify-between gap-2 px-[3mm] py-[1.5mm] border-b-2 border-text bg-[#F4F7F9] shrink-0">
          <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={60} height={20} style={{ height: "3mm", width: "auto" }} />
          <span className="font-bold uppercase tracking-[0.08em] text-muted" style={{ fontSize: "2.2mm" }}>
            {docType}
          </span>
        </div>

        <div className="flex-1 min-h-0 flex items-center gap-[3mm] px-[3mm] py-[2mm]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qrDataUrl} alt={`QR code for ${code}`} className="shrink-0 border border-border-soft" style={{ width: "26mm", height: "26mm" }} />

          <div className="flex-1 min-w-0 flex flex-col">
            <div className="font-bold text-text font-mono-data leading-none tracking-tight truncate" style={{ fontSize: "5mm" }}>
              {code}
            </div>
            {title && (
              <div className="font-semibold text-text leading-snug mt-[1mm] truncate" style={{ fontSize: "2.8mm" }}>
                {title}
              </div>
            )}
            <div className="mt-[1.5mm] flex flex-col">
              {mediumRows.map((f, i) => (
                <div
                  key={f.label}
                  className={`flex items-baseline justify-between gap-2 py-[0.5mm] ${i > 0 ? "border-t border-dotted border-border-soft" : ""}`}
                >
                  <span className="font-semibold uppercase tracking-[0.06em] text-faint shrink-0" style={{ fontSize: "2mm" }}>
                    {f.label}
                  </span>
                  <span className="font-semibold font-mono-data text-text text-right truncate" style={{ fontSize: "2.3mm" }}>
                    {f.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="label-card w-full max-w-[320px] border-2 border-text bg-white text-left overflow-hidden" data-size="large">
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b-2 border-text bg-[#F4F7F9]">
        <div className="flex items-center gap-1.5">
          <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={60} height={20} style={{ height: 13, width: "auto" }} />
          <span className="text-[7.5px] font-bold uppercase tracking-[0.08em] text-faint">Laboratory</span>
        </div>
        <span className="text-[8px] font-bold uppercase tracking-[0.08em] text-muted">{docType}</span>
      </div>

      <div className="flex items-start gap-2.5 p-2.5">
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
