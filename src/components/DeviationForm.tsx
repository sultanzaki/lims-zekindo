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
  assigneeId,
  dueDate,
  severity,
  assignableUsers,
}: {
  deviationId: string;
  rootCause: string | null;
  capa: string | null;
  assigneeId: string | null;
  dueDate: string | null;
  severity: string | null;
  assignableUsers: { id: string; name: string }[];
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
      <div className="grid grid-cols-2 gap-2">
        <select name="assigneeId" defaultValue={assigneeId ?? ""} className={inputClassSm}>
          <option value="">Unassigned</option>
          {assignableUsers.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select name="severity" defaultValue={severity ?? ""} className={inputClassSm}>
          <option value="">Severity…</option>
          <option value="Minor">Minor</option>
          <option value="Major">Major</option>
          <option value="Critical">Critical</option>
        </select>
      </div>
      <input type="date" name="dueDate" defaultValue={dueDate ?? ""} className={inputClassSm} />
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
