"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import Button from "@/components/ui/Button";

export default function ScannerClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const router = useRouter();
  const [status, setStatus] = useState<"starting" | "scanning" | "error" | "found">("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [manualId, setManualId] = useState("");

  useEffect(() => {
    const reader = new BrowserMultiFormatReader();
    let cancelled = false;

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, err, controls) => {
        controlsRef.current = controls;
        if (cancelled) return;
        if (result) {
          setStatus("found");
          controls.stop();
          const text = result.getText().trim();
          // Newer labels (equipment/reagent/location, and re-printed sample
          // labels) encode the full app path directly, e.g.
          // "/inventory/equipment/abc123". Older sample labels just encode
          // the bare Sample ID, so fall back to the sample route for those.
          router.push(text.startsWith("/") ? text : `/samples/${text}`);
        }
      })
      .then(() => {
        if (!cancelled) setStatus("scanning");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setStatus("error");
        setErrorMsg(
          e instanceof Error ? e.message : "Camera unavailable. Use manual entry below."
        );
      });

    return () => {
      cancelled = true;
      controlsRef.current?.stop();
    };
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-8 mx-3.5 mt-3.5 mb-2.5 bg-scanner-bg rounded-[20px]">
      <div className="relative w-[232px] h-[232px] rounded-[20px] overflow-hidden bg-white/[0.04]">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <Corner style={{ top: 0, left: 0, borderTop: "3.5px solid #2B8DB8", borderLeft: "3.5px solid #2B8DB8", borderRadius: "14px 0 0 0" }} />
        <Corner style={{ top: 0, right: 0, borderTop: "3.5px solid #2B8DB8", borderRight: "3.5px solid #2B8DB8", borderRadius: "0 14px 0 0" }} />
        <Corner style={{ bottom: 0, left: 0, borderBottom: "3.5px solid #2B8DB8", borderLeft: "3.5px solid #2B8DB8", borderRadius: "0 0 0 14px" }} />
        <Corner style={{ bottom: 0, right: 0, borderBottom: "3.5px solid #2B8DB8", borderRight: "3.5px solid #2B8DB8", borderRadius: "0 0 14px 0" }} />
        {status === "scanning" && (
          <div
            className="scan-line absolute left-5 right-5 h-[2px]"
            style={{ background: "#2B8DB8", boxShadow: "0 0 14px rgba(43,141,184,0.9)" }}
          />
        )}
      </div>

      <div className="text-center text-[#B4C6CF] text-[14px] leading-relaxed">
        {status === "starting" && "Requesting camera access…"}
        {status === "scanning" && (
          <>
            Hold the barcode or QR label inside the frame.
            <br />
            Scanning works offline.
          </>
        )}
        {status === "found" && "Sample found — opening…"}
        {status === "error" && (errorMsg || "Camera unavailable. Use manual entry below.")}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (manualId.trim()) router.push(`/samples/${manualId.trim()}`);
        }}
        className="w-full flex flex-col gap-2.5"
      >
        <input
          type="text"
          value={manualId}
          onChange={(e) => setManualId(e.target.value)}
          placeholder="Enter Sample ID e.g. LAB-24-0143"
          className="text-sm px-4 py-3.5 rounded-[13px] border border-white/15 bg-white/10 text-white placeholder:text-[#8C97A6]"
        />
        <Button type="submit">Look Up Sample ID</Button>
      </form>
    </div>
  );
}

function Corner({ style }: { style: React.CSSProperties }) {
  return <div className="absolute w-[38px] h-[38px]" style={style} />;
}
