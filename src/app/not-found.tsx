import Image from "next/image";
import LinkButton from "@/components/ui/LinkButton";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col bg-page-bg px-6">
      <div className="flex-1 flex flex-col items-center justify-center gap-6 py-10 max-w-sm mx-auto w-full text-center">
        <Image
          src="/zekindo-logo.png"
          alt="Zekindo Chemicals"
          width={140}
          height={28}
          style={{ height: 28, width: "auto" }}
        />

        <div className="flex flex-col gap-2">
          <div className="text-[44px] font-bold text-primary tracking-tight leading-none">404</div>
          <div className="text-[17px] font-bold text-text">Page not found</div>
          <div className="text-[13px] text-muted leading-relaxed">
            The page you&rsquo;re looking for doesn&rsquo;t exist, or the record may have been removed.
          </div>
        </div>

        <LinkButton href="/" fullWidth={false} className="px-8">
          Back to Home
        </LinkButton>
      </div>
    </div>
  );
}
