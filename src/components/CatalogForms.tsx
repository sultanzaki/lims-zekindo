"use client";

import { useActionState, useState } from "react";
import { createSampleTypeAction, createTestCatalogAction, type FormState } from "@/lib/actions/catalog";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

export function CreateSampleTypeForm() {
  const [state, formAction, pending] = useActionState(createSampleTypeAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-[18px] shadow-card p-4">
      <div className="text-[13px] font-semibold text-text">Add Sample Type</div>
      <input name="name" placeholder="e.g. Total Plate Count" required className={inputClassSm} />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Target TAT (hours)</label>
          <input name="targetTatHours" type="number" defaultValue={48} min={1} className={inputClassSm} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Retention (days)</label>
          <input name="retentionDays" type="number" defaultValue={30} min={1} className={inputClassSm} />
        </div>
      </div>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add Sample Type"}
      </Button>
    </form>
  );
}

export function CreateTestCatalogForm({ sampleTypes }: { sampleTypes: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createTestCatalogAction, initialState);
  const [resultMode, setResultMode] = useState<"SINGLE" | "MULTI">("SINGLE");
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-[18px] shadow-card p-4">
      <div className="text-[13px] font-semibold text-text">Add Test Definition</div>
      <select name="sampleTypeId" required defaultValue="" className={inputClassSm}>
        <option value="" disabled>Sample type…</option>
        {sampleTypes.map((t) => (
          <option key={t.id} value={t.id}>{t.name}</option>
        ))}
      </select>
      <input name="name" placeholder="Test name" required className={inputClassSm} />
      <div className="grid grid-cols-2 gap-2.5">
        <input name="unit" placeholder="Unit (e.g. CFU/g)" className={inputClassSm} />
        <input name="spec" placeholder="Spec (e.g. ≤100 CFU/g)" required className={inputClassSm} />
      </div>
      <input name="method" placeholder="Method / SOP reference (optional)" className={inputClassSm} />

      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border-soft">
        <label className="text-[11px] text-muted">Result Mode</label>
        <select
          name="resultMode"
          value={resultMode}
          onChange={(e) => setResultMode(e.target.value as "SINGLE" | "MULTI")}
          className={inputClassSm}
        >
          <option value="SINGLE">Single result</option>
          <option value="MULTI">Multiple readings (replicate / interval)</option>
        </select>
      </div>

      {resultMode === "MULTI" && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted">Replicates (e.g. 2 = duplo)</label>
            <input name="replicateCount" type="number" min={2} placeholder="e.g. 3" className={inputClassSm} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-muted">Interval plan (comma-separated)</label>
            <input name="intervalPlan" placeholder="e.g. 24h,48h,72h" className={inputClassSm} />
          </div>
        </div>
      )}

      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add Test"}
      </Button>
    </form>
  );
}
