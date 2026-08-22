"use client";

import { useActionState } from "react";
import { updateStorageAction, type FormState } from "@/lib/actions/samples";

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
        className="flex-1 text-xs px-3 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-white rounded-lg px-3.5 text-xs font-semibold cursor-pointer disabled:opacity-60"
      >
        Save Location
      </button>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
    </form>
  );
}
