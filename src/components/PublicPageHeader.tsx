import Image from "next/image";

/**
 * Branded header band shared by every public, no-login surface (/track and
 * /portal). Gives external clients an immediate "this is really from
 * Zekindo" signal instead of a plain white bar with a small logo.
 */
export default function PublicPageHeader({ label }: { label: string }) {
  return (
    <div
      className="px-5 pt-8 pb-9 flex flex-col items-center gap-2.5"
      style={{ background: "linear-gradient(155deg, #1A5F7A 0%, #2B8DB8 100%)" }}
    >
      <Image src="/zekindo-logo-white.png" alt="Zekindo Chemicals" width={110} height={37} style={{ height: 34, width: "auto" }} priority />
      <div className="text-[11px] font-semibold text-white/80 tracking-[0.16em] uppercase text-center px-4">{label}</div>
    </div>
  );
}
