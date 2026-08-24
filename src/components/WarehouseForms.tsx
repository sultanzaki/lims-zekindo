"use client";

import { useActionState } from "react";
import { createStorageLocationAction, type FormState } from "@/lib/actions/warehouse";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

export function CreateStorageLocationForm() {
  const [state, formAction, pending] = useActionState(createStorageLocationAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-[18px] shadow-card p-4">
      <div className="text-[13px] font-semibold text-text">Add Location</div>
      <input name="name" placeholder="e.g. Cold Room 1, Lab Room 2 - Shelf B" required className={inputClassSm} />
      <input name="notes" placeholder="Notes (optional)" className={inputClassSm} />
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add Location"}
      </Button>
    </form>
  );
}
