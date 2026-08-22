"use client";

import { useActionState } from "react";
import { submitTestResultAction, type FormState } from "@/lib/actions/samples";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

export default function TestResultForm({
  sampleId,
  testId,
  unit,
  isMulti = false,
}: {
  sampleId: string;
  testId: string;
  unit: string;
  isMulti?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitTestResultAction, initialState);

  return (
    <form action={formAction} className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4.5">
      <input type="hidden" name="sampleId" value={sampleId} />
      <input type="hidden" name="testId" value={testId} />

      <Field
        label={isMulti ? `Final Reported Result${unit ? ` (${unit})` : ""}` : `Result${unit ? ` (${unit})` : ""}`}
        htmlFor="result"
        hint={isMulti ? "The value that goes to supervisor/QA review and the COA." : `Unit: ${unit || "—"}`}
      >
        <input
          id="result"
          name="result"
          type="text"
          placeholder="e.g. 42"
          required
          className={`text-base py-3 ${inputClass}`}
        />
      </Field>

      <Field label="Notes (optional)" htmlFor="notes">
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="Observations, deviations…"
          className={`${inputClass} resize-none`}
        />
      </Field>

      {state.error && <div className="text-xs font-medium text-danger">{state.error}</div>}

      <Button type="submit" disabled={pending} className="mt-2">
        {pending ? "Submitting…" : "Submit for QA Review"}
      </Button>
    </form>
  );
}
