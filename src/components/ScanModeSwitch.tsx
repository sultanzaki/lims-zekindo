"use client";

import { useState } from "react";
import ScannerClient from "@/components/ScannerClient";
import NfcScannerClient from "@/components/NfcScannerClient";

type Mode = "nfc" | "qr";

function nfcIsSupported() {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

export default function ScanModeSwitch() {
  const [nfcSupported] = useState(nfcIsSupported);
  const [mode, setMode] = useState<Mode>(() => (nfcIsSupported() ? "nfc" : "qr"));

  return (
    <div className="flex-1 flex flex-col">
      {nfcSupported && (
        <div className="px-5 pt-3.5">
          <div className="relative flex bg-chip-bg rounded-full p-1">
            <div
              className="absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-full bg-white shadow-card-sm transition-transform duration-200 ease-out"
              style={{ transform: mode === "qr" ? "translateX(100%)" : "translateX(0%)" }}
            />
            <button
              type="button"
              onClick={() => setMode("nfc")}
              className={`relative z-10 flex-1 text-xs font-semibold py-2 rounded-full transition-colors ${mode === "nfc" ? "text-text" : "text-muted"}`}
            >
              NFC
            </button>
            <button
              type="button"
              onClick={() => setMode("qr")}
              className={`relative z-10 flex-1 text-xs font-semibold py-2 rounded-full transition-colors ${mode === "qr" ? "text-text" : "text-muted"}`}
            >
              QR / Barcode
            </button>
          </div>
        </div>
      )}
      <div key={mode} className="pop-in flex-1 flex flex-col">
        {mode === "nfc" ? <NfcScannerClient /> : <ScannerClient />}
      </div>
    </div>
  );
}
