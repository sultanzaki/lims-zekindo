"use client";

import { useActionState } from "react";
import { createSampleAction, type FormState } from "@/lib/actions/samples";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

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
      <Field label="Sample ID">
        <div className={`${inputClass} text-muted bg-surface`}>{nextSampleId} (auto-assigned)</div>
      </Field>

      <Field label="Sample Name" htmlFor="name">
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Bottled Drinking Water 600ml"
          className={inputClass}
        />
      </Field>

      <Field
        label="Sample Type"
        htmlFor="sampleTypeId"
        error={
          sampleTypes.length === 0
            ? "No sample types configured yet — ask an admin to add one under Catalog."
            : undefined
        }
      >
        <select id="sampleTypeId" name="sampleTypeId" required defaultValue="" className={inputClass}>
          <option value="" disabled>
            Select type…
          </option>
          {sampleTypes.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Source / Location" htmlFor="source">
        <input id="source" name="source" type="text" placeholder="e.g. Production Line 2" className={inputClass} />
      </Field>

      <Field label="Collected By" htmlFor="collectedBy">
        <input id="collectedBy" name="collectedBy" type="text" defaultValue={defaultCollectedBy} className={inputClass} />
      </Field>

      <Field label="Collection Date & Time" htmlFor="collectedDate">
        <input
          id="collectedDate"
          name="collectedDate"
          type="datetime-local"
          defaultValue={defaultDateTime}
          className={inputClass}
        />
      </Field>

      <Field label="Storage Location (optional)" htmlFor="storageLocation">
        <input
          id="storageLocation"
          name="storageLocation"
          type="text"
          placeholder="e.g. Freezer 2 - Shelf B"
          className={inputClass}
        />
      </Field>

      {state.error && <div className="text-xs font-medium text-danger">{state.error}</div>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Logging in…" : "Log Sample In"}
      </Button>
    </form>
  );
}
