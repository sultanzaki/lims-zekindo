"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { resolveNfcTagAction } from "@/lib/actions/nfc";

type Status = "starting" | "scanning" | "found" | "unknown" | "inactive" | "error";

export default function NfcScannerClient() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("starting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function run() {
      try {
        const reader = new NDEFReader();

        reader.addEventListener("reading", (ev) => {
          void (async () => {
            if (cancelled) return;
            let text = "";
            for (const record of ev.message.records) {
              if (record.recordType === "text" && record.data) {
                text = new TextDecoder(record.encoding || "utf-8").decode(record.data);
                break;
              }
            }
            const result = await resolveNfcTagAction(text);
            if (cancelled) return;
            if (result.status === "ok") {
              setStatus("found");
              controller.abort();
              router.push(result.redirectPath);
            } else {
              setStatus(result.status);
            }
          })();
        });

        reader.addEventListener("readingerror", () => {
          if (!cancelled) {
            setStatus("error");
            setErrorMsg("Couldn't read this tag. Try holding it steady against the back of your phone.");
          }
        });

        await reader.scan({ signal: controller.signal });
        if (!cancelled) setStatus("scanning");
      } catch (err) {
        if (cancelled) return;
        const e = err as { name?: string; message?: string };
        if (e?.name === "AbortError") return;
        setStatus("error");
        setErrorMsg(
          e?.name === "NotAllowedError"
            ? "NFC permission denied. Allow NFC access for this site in your browser settings."
            : e?.message || "NFC is unavailable on this device."
        );
      }
    }
    run();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [router]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 py-8 mx-3.5 mt-3.5 mb-2.5 bg-scanner-bg rounded-[20px]">
      <div className="relative w-[140px] h-[140px] flex items-center justify-center">
        {status === "scanning" && (
          <>
            <span className="nfc-ring" style={{ borderColor: "#2B8DB8", animationDelay: "0s" }} />
            <span className="nfc-ring" style={{ borderColor: "#2B8DB8", animationDelay: "0.55s" }} />
            <span className="nfc-ring" style={{ borderColor: "#2B8DB8", animationDelay: "1.1s" }} />
          </>
        )}
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#B4C6CF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <path d="M9 18h.01" />
        </svg>
      </div>

      <div className="text-center text-[#B4C6CF] text-[14px] leading-relaxed">
        {status === "starting" && "Requesting NFC access…"}
        {status === "scanning" && (
          <>
            Hold the tag against the back of your phone.
            <br />
            Works for samples, equipment, reagents, and chemicals.
          </>
        )}
        {status === "found" && "Tag found — opening…"}
        {status === "unknown" && "Unrecognized tag. Try a different one."}
        {status === "inactive" && "This tag is no longer active on any item."}
        {status === "error" && (errorMsg || "NFC is unavailable on this device.")}
      </div>
    </div>
  );
}
