"use client";

import { useActionState } from "react";
import type { FormState } from "@/lib/actions/samples";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

export default function EditSampleForm({
  action,
  defaultName,
  defaultRequestorName,
  defaultSource,
  defaultCollectedDate,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  defaultName: string;
  defaultRequestorName: string;
  defaultSource: string;
  defaultCollectedDate: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <form action={formAction} className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-5 md:max-w-[480px] md:w-full">
      <Field label="Sample Name" htmlFor="name">
        <input id="name" name="name" type="text" required defaultValue={defaultName} className={inputClass} />
      </Field>

      <Field label="Requestor" htmlFor="requestorName">
        <input
          id="requestorName"
          name="requestorName"
          type="text"
          defaultValue={defaultRequestorName}
          placeholder="Who requested this testing"
          className={inputClass}
        />
      </Field>

      <Field label="Source / Location" htmlFor="source">
        <input id="source" name="source" type="text" required defaultValue={defaultSource} className={inputClass} />
      </Field>

      <Field label="Collection Date & Time (WIB)" htmlFor="collectedDate">
        <input
          id="collectedDate"
          name="collectedDate"
          type="datetime-local"
          required
          defaultValue={defaultCollectedDate}
          className={inputClass}
        />
      </Field>

      {state.error && <div className="text-xs font-medium text-danger">{state.error}</div>}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Saving…" : "Save Changes"}
      </Button>
    </form>
  );
}
