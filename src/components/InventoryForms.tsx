"use client";

import { useActionState } from "react";
import {
  createReagentAction,
  updateReagentQuantityAction,
  createEquipmentAction,
  logCalibrationAction,
  type FormState,
} from "@/lib/actions/inventory";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

function LabeledField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[11px] text-muted">{label}</label>
      {children}
    </div>
  );
}

export function CreateReagentForm() {
  const [state, formAction, pending] = useActionState(createReagentAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-xl p-4">
      <div className="text-[13px] font-semibold text-text">Add Reagent</div>
      <LabeledField label="Reagent name">
        <input name="name" placeholder="e.g. Peptone Water" required className={inputClassSm} />
      </LabeledField>
      <div className="grid grid-cols-2 gap-2.5">
        <LabeledField label="Lot number">
          <input name="lotNumber" placeholder="LOT-001" required className={inputClassSm} />
        </LabeledField>
        <LabeledField label="Location">
          <input name="location" placeholder="e.g. Cold Room 1" className={inputClassSm} />
        </LabeledField>
        <LabeledField label="Quantity">
          <input name="quantity" type="number" step="any" placeholder="e.g. 500" required className={inputClassSm} />
        </LabeledField>
        <LabeledField label="Unit">
          <input name="unit" placeholder="e.g. mL" required className={inputClassSm} />
        </LabeledField>
        <LabeledField label="Min stock level">
          <input name="minStockLevel" type="number" step="any" placeholder="e.g. 50" className={inputClassSm} />
        </LabeledField>
        <LabeledField label="Expiry date">
          <input name="expiryDate" type="date" className={inputClassSm} />
        </LabeledField>
      </div>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add Reagent"}
      </Button>
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
        aria-label="Quantity"
        className={`w-20 ${inputClassSm}`}
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
        <LabeledField label="Equipment name">
          <input name="name" placeholder="e.g. Autoclave" required className={inputClassSm} />
        </LabeledField>
        <LabeledField label="Asset tag">
          <input name="assetTag" placeholder="e.g. EQ-014" required className={inputClassSm} />
        </LabeledField>
        <LabeledField label="Location">
          <input name="location" placeholder="e.g. Lab Room 2" className={inputClassSm} />
        </LabeledField>
        <LabeledField label="Next calibration due">
          <input name="nextCalibrationDue" type="date" className={inputClassSm} />
        </LabeledField>
      </div>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add Equipment"}
      </Button>
    </form>
  );
}

export function LogCalibrationForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(logCalibrationAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-1.5 mt-1.5">
      <LabeledField label="Next calibration due">
        <input name="nextCalibrationDue" type="date" className={inputClassSm} />
      </LabeledField>
      <input type="hidden" name="id" value={id} />
      <div className="flex items-center gap-2">
        <button type="submit" disabled={pending} className="text-[11px] font-semibold text-primary cursor-pointer disabled:opacity-60">
          {pending ? "Logging…" : "Log Calibration Done"}
        </button>
        {state.error && <span className="text-[11px] text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
