"use client";

import { useActionState } from "react";
import { createReagentAction, createEquipmentAction, type FormState } from "@/lib/actions/inventory";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

const REAGENT_CATEGORIES = ["Reagent", "Chemical", "Media", "Consumable"];

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

function LocationSelect({ locations }: { locations: { id: string; label: string }[] }) {
  return (
    <LabeledField label="Location">
      <select name="locationId" defaultValue="" className={inputClassSm}>
        <option value="">Not set</option>
        {locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.label}
          </option>
        ))}
      </select>
    </LabeledField>
  );
}

export function CreateReagentForm({ locations }: { locations: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(createReagentAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-[18px] shadow-card p-4">
      <div className="text-[13px] font-semibold text-text">Add Reagent / Chemical</div>
      <LabeledField label="Name">
        <input name="name" placeholder="e.g. Peptone Water" required className={inputClassSm} />
      </LabeledField>
      <div className="grid grid-cols-2 gap-2.5">
        <LabeledField label="Category">
          <select name="category" defaultValue="Reagent" className={inputClassSm}>
            {REAGENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </LabeledField>
        <LabeledField label="Lot number">
          <input name="lotNumber" placeholder="LOT-001" required className={inputClassSm} />
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
        <LocationSelect locations={locations} />
      </div>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add Reagent"}
      </Button>
    </form>
  );
}

export function CreateEquipmentForm({ locations }: { locations: { id: string; label: string }[] }) {
  const [state, formAction, pending] = useActionState(createEquipmentAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-[18px] shadow-card p-4">
      <div className="text-[13px] font-semibold text-text">Add Equipment</div>
      <div className="grid grid-cols-2 gap-2.5">
        <LabeledField label="Equipment name">
          <input name="name" placeholder="e.g. Autoclave" required className={inputClassSm} />
        </LabeledField>
        <LabeledField label="Asset tag">
          <input name="assetTag" placeholder="e.g. EQ-014" required className={inputClassSm} />
        </LabeledField>
        <LocationSelect locations={locations} />
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
