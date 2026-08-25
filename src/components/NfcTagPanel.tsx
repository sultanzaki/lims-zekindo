"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { checkNfcTagConflictAction, saveNfcTagAction } from "@/lib/actions/nfc";
import { encodeNfcPayload, type NfcEntityType } from "@/lib/nfc";
import { formatDateTime } from "@/lib/format";
import Button from "@/components/ui/Button";

type Phase = "idle" | "reading" | "conflict" | "writing" | "retryWrite" | "saving" | "success" | "error";

function readNdefText(message: NDEFMessage): string {
  for (const record of message.records) {
    if (record.recordType === "text" && record.data) {
      return new TextDecoder(record.encoding || "utf-8").decode(record.data);
    }
  }
  return "";
}

export default function NfcTagPanel({
  entityType,
  entityId,
  activeTag,
}: {
  entityType: NfcEntityType;
  entityId: string;
  activeTag: { registeredBy: string; registeredAt: Date } | null;
}) {
  const router = useRouter();
  const [supported] = useState(() => typeof window !== "undefined" && "NDEFReader" in window);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [message, setMessage] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const pendingRef = useRef<{ token: string; serialNumber: string } | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function reset() {
    abortRef.current?.abort();
    pendingRef.current = null;
    setOpen(false);
    setPhase("idle");
    setMessage("");
  }

  async function startFlow() {
    setOpen(true);
    setPhase("reading");
    setMessage("");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const reader = new NDEFReader();
      const reading = await new Promise<NDEFReadingEvent>((resolve, reject) => {
        reader.addEventListener("reading", (ev) => resolve(ev), { once: true });
        reader.addEventListener(
          "readingerror",
          () => reject(new Error("Couldn't read this tag. Hold it steady against the back of your phone and try again.")),
          { once: true }
        );
        reader.scan({ signal: controller.signal }).catch(reject);
      });
      controller.abort();

      const existingText = readNdefText(reading.message);
      const conflictResult = await checkNfcTagConflictAction(existingText || null);
      if (conflictResult.conflict) {
        setPhase("conflict");
        setMessage(conflictResult.label);
        return;
      }

      await writeAndSave(reading.serialNumber);
    } catch (err) {
      handleError(err);
    }
  }

  async function writeAndSave(serialNumber: string) {
    setPhase("writing");
    const token = crypto.randomUUID();
    try {
      const writer = new NDEFReader();
      await writer.write({ records: [{ recordType: "text", data: encodeNfcPayload(token) }] });
    } catch {
      pendingRef.current = { token, serialNumber };
      setPhase("retryWrite");
      setMessage("Couldn't write to this tag. Tap Retry and hold the tag steady against your phone.");
      return;
    }
    await persist(token, serialNumber);
  }

  async function retryWrite() {
    if (!pendingRef.current) return;
    const { token, serialNumber } = pendingRef.current;
    setPhase("writing");
    try {
      const writer = new NDEFReader();
      await writer.write({ records: [{ recordType: "text", data: encodeNfcPayload(token) }] });
    } catch {
      setPhase("retryWrite");
      setMessage("Still couldn't write. Make sure the tag is writable and try again.");
      return;
    }
    await persist(token, serialNumber);
  }

  async function persist(token: string, serialNumber: string) {
    setPhase("saving");
    const result = await saveNfcTagAction({ entityType, entityId, token, serialNumber });
    if ("error" in result) {
      setPhase("error");
      setMessage(result.error);
      return;
    }
    setPhase("success");
    setTimeout(() => {
      reset();
      router.refresh();
    }, 1200);
  }

  function handleError(err: unknown) {
    const e = err as { name?: string; message?: string };
    if (e?.name === "AbortError") {
      reset();
      return;
    }
    setPhase("error");
    setMessage(
      e?.name === "NotAllowedError"
        ? "NFC permission was denied. Allow NFC access for this site in your browser settings and try again."
        : e?.message || "Something went wrong reading the tag."
    );
  }

  return (
    <div className="bg-white border border-border rounded-[18px] shadow-card p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[13px] font-semibold text-text">NFC Tag</div>
        {activeTag && (
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-[#E6F4EA] text-success-dark">Registered</span>
        )}
      </div>

      {activeTag ? (
        <div className="text-[11px] text-muted">
          Registered by {activeTag.registeredBy} · {formatDateTime(activeTag.registeredAt)}
        </div>
      ) : (
        <div className="text-[11px] text-muted">No NFC tag registered yet.</div>
      )}

      {!supported && <div className="text-[11px] text-faint">NFC registration is only available in Chrome on Android.</div>}

      {supported && !open && (
        <Button type="button" variant="secondary" size="sm" onClick={startFlow}>
          {activeTag ? "Replace NFC Tag" : "Register NFC Tag"}
        </Button>
      )}

      {supported && open && (
        <div className="flex flex-col items-center gap-3 py-3">
          {(phase === "reading" || phase === "writing" || phase === "saving") && (
            <>
              <NfcPulse />
              <div className="text-xs text-muted text-center">
                {phase === "reading" && "Hold the tag against the back of your phone…"}
                {phase === "writing" && "Keep holding — writing tag…"}
                {phase === "saving" && "Saving…"}
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={reset}>
                Cancel
              </Button>
            </>
          )}
          {phase === "conflict" && (
            <>
              <div className="text-xs text-danger text-center">
                This tag is already registered to {message}. Deactivate it there first (Replace Tag on that item), or use a
                different tag.
              </div>
              <Button type="button" variant="secondary" size="sm" onClick={reset}>
                Close
              </Button>
            </>
          )}
          {phase === "retryWrite" && (
            <>
              <div className="text-xs text-danger text-center">{message}</div>
              <div className="flex gap-2 w-full">
                <Button type="button" variant="secondary" size="sm" onClick={reset}>
                  Cancel
                </Button>
                <Button type="button" size="sm" onClick={retryWrite}>
                  Retry
                </Button>
              </div>
            </>
          )}
          {phase === "error" && (
            <>
              <div className="text-xs text-danger text-center">{message}</div>
              <Button type="button" variant="secondary" size="sm" onClick={reset}>
                Close
              </Button>
            </>
          )}
          {phase === "success" && <div className="text-xs text-success-dark font-semibold text-center">Tag saved ✓</div>}
        </div>
      )}
    </div>
  );
}

function NfcPulse() {
  return (
    <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
      <span className="nfc-ring" style={{ animationDelay: "0s" }} />
      <span className="nfc-ring" style={{ animationDelay: "0.5s" }} />
      <span className="nfc-ring" style={{ animationDelay: "1s" }} />
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <path d="M9 18h.01" />
      </svg>
    </div>
  );
}
