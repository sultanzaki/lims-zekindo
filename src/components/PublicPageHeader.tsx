import Image from "next/image";

/**
 * Plain masthead bar shared by every public, no-login surface (/track and
 * /portal). Deliberately flat — no color block or shadow — so it never
 * competes with the content card below it; just a quiet, permanent brand
 * mark plus the current section label.
 */
export default function PublicPageHeader({ label }: { label: string }) {
  return (
    <div className="border-b border-border bg-white px-5 py-4 flex items-center gap-3">
      <Image src="/zekindo-logo.png" alt="Zekindo Chemicals" width={92} height={31} style={{ height: 24, width: "auto" }} priority />
      <div className="h-4 w-px bg-border" />
      <div className="text-[11px] font-semibold text-muted tracking-[0.14em] uppercase">{label}</div>
    </div>
  );
}
