"use client";

import { useActionState } from "react";
import { createSampleAction, type FormState } from "@/lib/actions/samples";

const initialState: FormState = {};

export default function NewSampleForm({
  nextSampleId,
  defaultCollectedBy,
  sampleTypes,
}: {
  nextSampleId: string;
  defaultCollectedBy: string;
  sampleTypes: { id: string; name: string }[];
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
        <label className="text-xs font-semibold text-text" htmlFor="sampleTypeId">
          Sample Type
        </label>
        <select
          id="sampleTypeId"
          name="sampleTypeId"
          required
          defaultValue=""
          className="text-sm px-3.5 py-2.5 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
        >
          <option value="" disabled>
            Select type…
          </option>
          {sampleTypes.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
        {sampleTypes.length === 0 && (
          <div className="text-[11px] text-danger">
            No sample types configured yet — ask an admin to add one under Catalog.
          </div>
        )}
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

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-text" htmlFor="storageLocation">
          Storage Location (optional)
        </label>
        <input
          id="storageLocation"
          name="storageLocation"
          type="text"
          placeholder="e.g. Freezer 2 - Shelf B"
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
