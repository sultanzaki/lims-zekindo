"use client";

import { useActionState } from "react";
import { createStorageLocationAction, type FormState } from "@/lib/actions/warehouse";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

export function CreateStorageLocationForm({
  parentOptions,
  fixedParentId,
  fixedParentLabel,
}: {
  parentOptions?: { id: string; label: string }[];
  fixedParentId?: string;
  fixedParentLabel?: string;
} = {}) {
  const [state, formAction, pending] = useActionState(createStorageLocationAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-[18px] shadow-card p-4">
      <div className="text-[13px] font-semibold text-text">
        {fixedParentId ? `Add Sub-location in "${fixedParentLabel}"` : "Add Location"}
      </div>
      <input
        name="name"
        placeholder={fixedParentId ? "e.g. Rak X" : "e.g. KBI, Microbiology Lab"}
        required
        className={inputClassSm}
      />
      {fixedParentId ? (
        <input type="hidden" name="parentId" value={fixedParentId} />
      ) : parentOptions && parentOptions.length > 0 ? (
        <select name="parentId" defaultValue="" className={inputClassSm}>
          <option value="">Top level (no parent)</option>
          {parentOptions.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      ) : null}
      <input name="notes" placeholder="Notes (optional)" className={inputClassSm} />
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add Location"}
      </Button>
    </form>
  );
}
