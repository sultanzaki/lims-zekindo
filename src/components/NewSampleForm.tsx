"use client";

import { useActionState } from "react";
import { createSampleAction, type FormState } from "@/lib/actions/samples";
import { SAMPLE_TYPE_OPTIONS } from "@/lib/status";

const initialState: FormState = {};

export default function NewSampleForm({
  nextSampleId,
  defaultCollectedBy,
}: {
  nextSampleId: string;
  defaultCollectedBy: string;
}) {
  const [state, formAction, pending] = useActionState(createSampleAction, initialState);

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const defaultDateTime = now.toISOString().slice(0, 16);

  return (
    <form action={formAction} className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text">Sample ID</label>
        <div className="text-sm px-3.5 py-2.5 border-[1.5px] border-border-soft rounded-lg text-muted bg-surface">
          {nextSampleId} (auto-assigned)
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text" htmlFor="type">
          Sample Type
        </label>
        <select
          id="type"
          name="type"
          required
          defaultValue=""
          className="text-sm px-3.5 py-2.5 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
        >
          <option value="" disabled>
            Select type…
          </option>
          {SAMPLE_TYPE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text" htmlFor="source">
          Source / Location
        </label>
        <input
          id="source"
          name="source"
          type="text"
          placeholder="e.g. Production Line 2"
          className="text-sm px-3.5 py-2.5 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text" htmlFor="collectedBy">
          Collected By
        </label>
        <input
          id="collectedBy"
          name="collectedBy"
          type="text"
          defaultValue={defaultCollectedBy}
          className="text-sm px-3.5 py-2.5 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text" htmlFor="collectedDate">
          Collection Date &amp; Time
        </label>
        <input
          id="collectedDate"
          name="collectedDate"
          type="datetime-local"
          defaultValue={defaultDateTime}
          className="text-sm px-3.5 py-2.5 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
        />
      </div>

      {state.error && <div className="text-xs font-medium text-danger">{state.error}</div>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 bg-primary text-white rounded-full py-3.5 text-[15px] font-semibold cursor-pointer disabled:opacity-60"
      >
        {pending ? "Logging in…" : "Log Sample In"}
      </button>
    </form>
  );
}
