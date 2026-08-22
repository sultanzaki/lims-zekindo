"use client";

import { useActionState } from "react";
import { updateStorageAction, type FormState } from "@/lib/actions/samples";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

export default function StorageLocationForm({
  sampleId,
  currentLocation,
}: {
  sampleId: string;
  currentLocation: string | null;
}) {
  const [state, formAction, pending] = useActionState(updateStorageAction, initialState);

  return (
    <form action={formAction} className="flex gap-2 -mt-3">
      <input type="hidden" name="sampleId" value={sampleId} />
      <input
        type="text"
        name="storageLocation"
        defaultValue={currentLocation ?? ""}
        placeholder="e.g. Freezer 2 - Shelf B"
        className={`flex-1 ${inputClassSm}`}
      />
      <Button type="submit" disabled={pending} size="sm" fullWidth={false} className="shrink-0">
        Save Location
      </Button>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
    </form>
  );
}
