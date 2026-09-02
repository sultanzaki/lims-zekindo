"use client";

import { useActionState, useState } from "react";
import { createSampleTypeAction, createTestCatalogAction, createBusinessUnitAction, type FormState } from "@/lib/actions/catalog";
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

type ResultType = "NUMERIC" | "CATEGORICAL" | "TEXT";
type NumericMode = "lte" | "gte" | "range" | "target" | "info";

export function CreateTestCatalogForm({ sampleTypes }: { sampleTypes: { id: string; name: string }[] }) {
  const [state, formAction, pending] = useActionState(createTestCatalogAction, initialState);
  const [resultMode, setResultMode] = useState<"SINGLE" | "MULTI">("SINGLE");
  const [resultType, setResultType] = useState<ResultType>("NUMERIC");
  const [numericMode, setNumericMode] = useState<NumericMode>("lte");

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
      <input name="unit" placeholder="Unit (e.g. CFU/g) — optional" className={inputClassSm} />
      <input name="method" placeholder="Method / SOP reference (optional)" className={inputClassSm} />

      <div className="flex flex-col gap-1.5 pt-1.5 border-t border-border-soft">
        <label className="text-[11px] text-muted">Result Type</label>
        <select
          name="resultType"
          value={resultType}
          onChange={(e) => setResultType(e.target.value as ResultType)}
          className={inputClassSm}
        >
          <option value="NUMERIC">Numeric — a measured value against a limit</option>
          <option value="CATEGORICAL">Categorical — pick from a fixed list</option>
          <option value="TEXT">Text — descriptive, no pass/fail</option>
        </select>
      </div>

      {resultType === "NUMERIC" && (
        <div className="flex flex-col gap-2.5">
          <select
            name="numericMode"
            value={numericMode}
            onChange={(e) => setNumericMode(e.target.value as NumericMode)}
            className={inputClassSm}
          >
            <option value="lte">At most (≤ limit)</option>
            <option value="gte">At least (≥ limit)</option>
            <option value="range">Between a min and a max</option>
            <option value="target">Target value ± tolerance</option>
            <option value="info">Recorded only — no pass/fail limit</option>
          </select>

          {(numericMode === "lte" || numericMode === "gte") && (
            <input name="numericLimit" type="number" step="any" placeholder="Limit (e.g. 100)" required className={inputClassSm} />
          )}
          {numericMode === "range" && (
            <div className="grid grid-cols-2 gap-2.5">
              <input name="numericMin" type="number" step="any" placeholder="Min (e.g. 6.5)" required className={inputClassSm} />
              <input name="numericMax" type="number" step="any" placeholder="Max (e.g. 8.5)" required className={inputClassSm} />
            </div>
          )}
          {numericMode === "target" && (
            <div className="grid grid-cols-2 gap-2.5">
              <input name="numericTarget" type="number" step="any" placeholder="Target (e.g. 500)" required className={inputClassSm} />
              <input name="numericTolerance" type="number" step="any" min={0} placeholder="± tolerance (e.g. 2)" required className={inputClassSm} />
            </div>
          )}
        </div>
      )}

      {resultType === "CATEGORICAL" && (
        <div className="flex flex-col gap-2.5">
          <input name="categoricalOptions" placeholder="Options, comma-separated (e.g. Negative,Positive)" required className={inputClassSm} />
          <input
            name="categoricalPassOptions"
            placeholder="Which pass? (e.g. Negative)"
            required
            className={inputClassSm}
          />
          <label className="flex items-center gap-2 text-[11px] text-muted">
            <input name="categoricalOrdered" type="checkbox" className="w-3.5 h-3.5" />
            Options are an ordered scale (pass = up to the listed level)
          </label>
        </div>
      )}

      {resultType === "TEXT" && (
        <label className="flex items-center gap-2 text-[11px] text-muted">
          <input name="requiresAttachment" type="checkbox" className="w-3.5 h-3.5" />
          Requires a photo/file attachment
        </label>
      )}

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

export function CreateBusinessUnitForm() {
  const [state, formAction, pending] = useActionState(createBusinessUnitAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-[18px] shadow-card p-4">
      <div className="text-[13px] font-semibold text-text">Add Business Unit</div>
      <input name="name" placeholder="e.g. Marketing, R&D, Production" required className={inputClassSm} />
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Adding…" : "Add Business Unit"}
      </Button>
    </form>
  );
}
