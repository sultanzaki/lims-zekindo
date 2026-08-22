"use client";

import { useActionState } from "react";
import { updateDeviationAction, type FormState } from "@/lib/actions/deviations";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

export default function DeviationForm({
  deviationId,
  rootCause,
  capa,
}: {
  deviationId: string;
  rootCause: string | null;
  capa: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateDeviationAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-2 mt-2">
      <input type="hidden" name="deviationId" value={deviationId} />
      <textarea
        name="rootCause"
        defaultValue={rootCause ?? ""}
        placeholder="Root cause…"
        rows={2}
        className={`${inputClassSm} resize-none`}
      />
      <textarea
        name="capa"
        defaultValue={capa ?? ""}
        placeholder="Corrective / preventive action…"
        rows={2}
        className={`${inputClassSm} resize-none`}
      />
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <div className="flex gap-2">
        <Button type="submit" name="close" value="false" disabled={pending} variant="secondary" size="sm">
          Save
        </Button>
        <Button type="submit" name="close" value="true" disabled={pending} variant="success" size="sm">
          Save &amp; Close
        </Button>
      </div>
    </form>
  );
}
