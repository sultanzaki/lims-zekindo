"use client";

import { useActionState } from "react";
import { updateDeviationAction, type FormState } from "@/lib/actions/deviations";

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
        className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white resize-none"
      />
      <textarea
        name="capa"
        defaultValue={capa ?? ""}
        placeholder="Corrective / preventive action…"
        rows={2}
        className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white resize-none"
      />
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <div className="flex gap-2">
        <button
          type="submit"
          name="close"
          value="false"
          disabled={pending}
          className="flex-1 bg-chip-bg text-text rounded-full py-2 text-xs font-semibold cursor-pointer disabled:opacity-60"
        >
          Save
        </button>
        <button
          type="submit"
          name="close"
          value="true"
          disabled={pending}
          className="flex-1 bg-success text-white rounded-full py-2 text-xs font-semibold cursor-pointer disabled:opacity-60"
        >
          Save &amp; Close
        </button>
      </div>
    </form>
  );
}
