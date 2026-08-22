"use client";

import { useActionState } from "react";
import { createSampleTypeAction, createTestCatalogAction, type FormState } from "@/lib/actions/catalog";

const initialState: FormState = {};

export function CreateSampleTypeForm() {
  const [state, formAction, pending] = useActionState(createSampleTypeAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-xl p-4">
      <div className="text-[13px] font-semibold text-text">Add Sample Type</div>
      <input name="name" placeholder="e.g. Total Plate Count" required className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Target TAT (hours)</label>
          <input name="targetTatHours" type="number" defaultValue={48} min={1} className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Retention (days)</label>
          <input name="retentionDays" type="number" defaultValue={30} min={1} className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        </div>
      </div>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <button type="submit" disabled={pending} className="bg-primary text-white rounded-full py-2 text-xs font-semibold cursor-pointer disabled:opacity-60">
        {pending ? "Adding…" : "Add Sample Type"}
      </button>
    </form>
  );
}

export function CreateTestCatalogForm({ sampleTypes }: { sampleTypes: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createTestCatalogAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-xl p-4">
      <div className="text-[13px] font-semibold text-text">Add Test Definition</div>
      <select name="sampleTypeId" required defaultValue="" className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white">
        <option value="" disabled>Sample type…</option>
        {sampleTypes.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <input name="name" placeholder="Test name" required className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
      <div className="grid grid-cols-2 gap-2.5">
        <input name="unit" placeholder="Unit (e.g. CFU/g)" className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
        <input name="spec" placeholder="Spec (e.g. ≤100 CFU/g)" required className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
      </div>
      <input name="method" placeholder="Method / SOP reference (optional)" className="text-xs px-2.5 py-2 border-[1.5px] border-border-soft rounded-lg text-text bg-white" />
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <button type="submit" disabled={pending} className="bg-primary text-white rounded-full py-2 text-xs font-semibold cursor-pointer disabled:opacity-60">
        {pending ? "Adding…" : "Add Test"}
      </button>
    </form>
  );
}
