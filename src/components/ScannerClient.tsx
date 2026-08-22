"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";

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
          router.push(`/samples/${result.getText().trim()}`);
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
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-7">
      <div className="relative w-[220px] h-[220px] rounded-xl overflow-hidden bg-black">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        <Corner style={{ top: 0, left: 0, borderTop: "3px solid #2B8DB8", borderLeft: "3px solid #2B8DB8", borderRadius: "6px 0 0 0" }} />
        <Corner style={{ top: 0, right: 0, borderTop: "3px solid #2B8DB8", borderRight: "3px solid #2B8DB8", borderRadius: "0 6px 0 0" }} />
        <Corner style={{ bottom: 0, left: 0, borderBottom: "3px solid #2B8DB8", borderLeft: "3px solid #2B8DB8", borderRadius: "0 0 0 6px" }} />
        <Corner style={{ bottom: 0, right: 0, borderBottom: "3px solid #2B8DB8", borderRight: "3px solid #2B8DB8", borderRadius: "0 0 6px 0" }} />
      </div>

      <div className="text-center text-[#A0B4BF] text-[13px] leading-relaxed">
        {status === "starting" && "Requesting camera access…"}
        {status === "scanning" && "Align the sample barcode or QR label within the frame"}
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
          className="text-sm px-3.5 py-3 rounded-lg border-none bg-white/10 text-white placeholder:text-[#A0B4BF]"
        />
        <button
          type="submit"
          className="bg-primary text-white rounded-full py-3 text-sm font-semibold cursor-pointer"
        >
          Look Up Sample ID
        </button>
      </form>
    </div>
  );
}

function Corner({ style }: { style: React.CSSProperties }) {
  return <div className="absolute w-[34px] h-[34px]" style={style} />;
}
