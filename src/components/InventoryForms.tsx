"use client";

import { useActionState } from "react";
import {
  createReagentAction,
  updateReagentQuantityAction,
  createEquipmentAction,
  logCalibrationAction,
  type FormState,
} from "@/lib/actions/inventory";

const initialState: FormState = {};

export function CreateReagentForm() {
  const [state, formAction, pending] = useActionState(createReagentAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-xl p-4">
      <div className="text-[13px] font-semibold text-text">Add Reagent</div>
      <input name="name" placeholder="Reagent name" required className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
      <div className="grid grid-cols-2 gap-2.5">
        <input name="lotNumber" placeholder="Lot number" required className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        <input name="location" placeholder="Location" className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        <input name="quantity" type="number" step="any" placeholder="Quantity" required className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        <input name="unit" placeholder="Unit (e.g. mL)" required className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        <input name="minStockLevel" type="number" step="any" placeholder="Min stock level" className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        <input name="expiryDate" type="date" className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
      </div>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <button type="submit" disabled={pending} className="bg-primary text-white rounded-full py-2 text-xs font-semibold cursor-pointer disabled:opacity-60">
        {pending ? "Adding…" : "Add Reagent"}
      </button>
    </form>
  );
}

export function UpdateQuantityForm({ id, quantity, unit }: { id: string; quantity: number; unit: string }) {
  const [, formAction, pending] = useActionState(updateReagentQuantityAction, initialState);
  return (
    <form action={formAction} className="flex items-center gap-1.5">
      <input type="hidden" name="id" value={id} />
      <input
        name="quantity"
        type="number"
        step="any"
        defaultValue={quantity}
        className="w-20 text-xs px-2 py-1 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
      />
      <span className="text-[11px] text-muted">{unit}</span>
      <button type="submit" disabled={pending} className="text-[11px] font-semibold text-primary cursor-pointer disabled:opacity-60">
        Update
      </button>
    </form>
  );
}

export function CreateEquipmentForm() {
  const [state, formAction, pending] = useActionState(createEquipmentAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-xl p-4">
      <div className="text-[13px] font-semibold text-text">Add Equipment</div>
      <div className="grid grid-cols-2 gap-2.5">
        <input name="name" placeholder="Equipment name" required className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        <input name="assetTag" placeholder="Asset tag" required className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        <input name="location" placeholder="Location" className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Next calibration due</label>
          <input name="nextCalibrationDue" type="date" className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        </div>
      </div>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <button type="submit" disabled={pending} className="bg-primary text-white rounded-full py-2 text-xs font-semibold cursor-pointer disabled:opacity-60">
        {pending ? "Adding…" : "Add Equipment"}
      </button>
    </form>
  );
}

export function LogCalibrationForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(logCalibrationAction, initialState);
  return (
    <form action={formAction} className="flex items-center gap-1.5 mt-1.5">
      <input type="hidden" name="id" value={id} />
      <input
        name="nextCalibrationDue"
        type="date"
        className="text-[11px] px-2 py-1 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
      />
      <button type="submit" disabled={pending} className="text-[11px] font-semibold text-primary cursor-pointer disabled:opacity-60">
        {pending ? "Logging…" : "Log Calibration Done"}
      </button>
      {state.error && <span className="text-[11px] text-danger">{state.error}</span>}
    </form>
  );
}
