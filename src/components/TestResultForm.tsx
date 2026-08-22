"use client";

import { useActionState } from "react";
import { submitTestResultAction, type FormState } from "@/lib/actions/samples";

const initialState: FormState = {};

export default function TestResultForm({
  sampleId,
  testId,
  unit,
}: {
  sampleId: string;
  testId: string;
  unit: string;
}) {
  const [state, formAction, pending] = useActionState(submitTestResultAction, initialState);

  return (
    <form action={formAction} className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4.5">
      <input type="hidden" name="sampleId" value={sampleId} />
      <input type="hidden" name="testId" value={testId} />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text" htmlFor="result">
          Result {unit && `(${unit})`}
        </label>
        <input
          id="result"
          name="result"
          type="text"
          placeholder="e.g. 42"
          required
          className="text-base px-3.5 py-3 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
        />
        <div className="text-[11px] text-muted">Unit: {unit || "—"}</div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text" htmlFor="notes">
          Notes (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Observations, deviations…"
          className="text-sm px-3.5 py-3 border-[1.5px] border-border-soft rounded-lg text-text bg-white resize-none"
        />
      </div>

      {state.error && <div className="text-xs font-medium text-danger">{state.error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 bg-primary text-white rounded-full py-3.5 text-[15px] font-semibold cursor-pointer disabled:opacity-60"
      >
        {pending ? "Submitting…" : "Submit for QA Review"}
      </button>
    </form>
  );
}
