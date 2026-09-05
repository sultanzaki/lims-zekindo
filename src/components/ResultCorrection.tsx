"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { correctTestResultAction, type FormState } from "@/lib/actions/samples";

// Inline correction control for an already-submitted test result. Shown to
// supervisors/QA/admins only (see callers). The previous value is snapshotted
// server-side (Test.previousResult) and the change is audit-logged, so a
// corrected COA always has a trail — this exists for genuine transcription
// fixes, not for re-running the analysis (that path is reject → recollection).
export default function ResultCorrection({
  sampleId,
  testId,
  currentResult,
  previousResult,
  correctedAt,
  correctedByName,
}: {
  sampleId: string;
  testId: string;
  currentResult: string | null;
  previousResult: string | null;
  correctedAt: Date | null;
  correctedByName: string | null;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(currentResult ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (currentResult == null) return null; // only correct results that exist

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || !reason.trim()) return;
    setSaving(true);
    setError("");
    const fd = new FormData();
    fd.set("sampleId", sampleId);
    fd.set("testId", testId);
    fd.set("result", value.trim());
    fd.set("reason", reason.trim());
    const res = (await correctTestResultAction({}, fd)) as FormState;
    setSaving(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="border-t border-border-soft">
      {correctedAt && (
        <div className="px-[15px] pt-2.5 text-[11px] text-faint">
          Corrected {correctedAt.toLocaleString()} by {correctedByName ?? "staff"}
          {previousResult != null && <> — previous value {previousResult}</>}
        </div>
      )}
      <div className="px-[15px] py-2.5 flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-warning-dark uppercase tracking-wide">
          Published result — correct only genuine transcription errors
        </span>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[12px] font-semibold text-primary px-3 py-1.5 rounded-full border border-primary/30 hover:bg-primary-soft transition-colors cursor-pointer shrink-0"
        >
          {open ? "Cancel" : "Correct result"}
        </button>
      </div>
      {open && (
        <form onSubmit={submit} className="px-[15px] pb-3.5 flex flex-col gap-2">
          <label className="text-[11px] font-semibold text-text" htmlFor={`correct-val-${testId}`}>
            Corrected value
          </label>
          <input
            id={`correct-val-${testId}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="border border-border rounded-[10px] px-3 py-2 text-sm text-text w-full"
          />
          <label className="text-[11px] font-semibold text-text" htmlFor={`correct-reason-${testId}`}>
            Reason (required, shown in audit trail)
          </label>
          <textarea
            id={`correct-reason-${testId}`}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="e.g. Typo in transcription — original result was 0.15"
            className="border border-border rounded-[10px] px-3 py-2 text-sm text-text w-full resize-none"
          />
          {error && <div className="text-xs text-danger">{error}</div>}
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              disabled={saving || !value.trim() || !reason.trim()}
              className="text-[13px] font-semibold px-4 py-2 rounded-full bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {saving ? "Saving…" : "Save correction"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
