"use client";

import { useActionState } from "react";
import { addTestReadingAction, deleteTestReadingAction, type FormState } from "@/lib/actions/samples";
import { inputClassSm } from "@/components/ui/Field";
import SectionLabel from "@/components/ui/SectionLabel";
import Button from "@/components/ui/Button";
import { formatDateTime } from "@/lib/format";

type Reading = {
  id: string;
  intervalLabel: string | null;
  replicateIndex: number | null;
  value: string;
  note: string | null;
  enteredBy: string;
  takenAt: Date;
};

const initialState: FormState = {};

export default function TestReadingsPanel({
  sampleId,
  testId,
  unit,
  intervalPlan,
  replicateCount,
  readings,
}: {
  sampleId: string;
  testId: string;
  unit: string;
  intervalPlan: string | null;
  replicateCount: number | null;
  readings: Reading[];
}) {
  const boundAdd = addTestReadingAction.bind(null, sampleId, testId);
  const [state, formAction, pending] = useActionState(boundAdd, initialState);
  const checkpoints = intervalPlan ? intervalPlan.split(",") : [];

  const numericValues = readings
    .map((r) => Number(r.value))
    .filter((n) => Number.isFinite(n));
  const suggestedAverage =
    numericValues.length > 0
      ? (numericValues.reduce((sum, n) => sum + n, 0) / numericValues.length).toFixed(2)
      : null;

  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionLabel className="mb-2">
          Readings {readings.length > 0 && `(${readings.length})`}
        </SectionLabel>

        {readings.length === 0 ? (
          <div className="text-xs text-muted border border-dashed border-border rounded-[8px] p-3 text-center">
            No readings recorded yet — add the first one below.
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {readings.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 bg-surface border border-border rounded-[8px] px-3 py-2 text-xs">
                <div className="flex flex-col gap-0.5">
                  <div className="font-semibold text-text">
                    {r.value} {unit}
                    {r.replicateIndex && <span className="text-muted font-normal"> · Rep {r.replicateIndex}</span>}
                    {r.intervalLabel && <span className="text-muted font-normal"> · {r.intervalLabel}</span>}
                  </div>
                  <div className="text-[10px] text-faint">
                    {r.enteredBy} · {formatDateTime(r.takenAt)}
                  </div>
                  {r.note && <div className="text-[11px] text-muted">{r.note}</div>}
                </div>
                <form action={deleteTestReadingAction.bind(null, sampleId, testId, r.id)}>
                  <button type="submit" className="text-[11px] font-semibold text-danger cursor-pointer shrink-0">
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>

      <form action={formAction} className="flex flex-col gap-2 bg-white border border-border rounded-[8px] p-3">
        <div className="text-[11px] font-semibold text-text">New Reading</div>
        <div className="grid grid-cols-2 gap-2">
          {checkpoints.length > 0 && (
            <select name="intervalLabel" required className={inputClassSm}>
              <option value="" disabled>Checkpoint…</option>
              {checkpoints.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
          {replicateCount && replicateCount > 1 && (
            <select name="replicateIndex" required className={inputClassSm}>
              <option value="" disabled>Replicate…</option>
              {Array.from({ length: replicateCount }).map((_, i) => (
                <option key={i} value={i + 1}>Replicate {i + 1}</option>
              ))}
            </select>
          )}
          <input
            name="value"
            placeholder={`Value${unit ? ` (${unit})` : ""}`}
            required
            className={`${inputClassSm} ${checkpoints.length === 0 && (!replicateCount || replicateCount <= 1) ? "col-span-2" : ""}`}
          />
        </div>
        <input name="note" placeholder="Note (optional)" className={inputClassSm} />
        {state.error && <div className="text-[11px] text-danger">{state.error}</div>}
        <Button type="submit" disabled={pending} variant="secondary" size="sm">
          {pending ? "Adding…" : "Add Reading"}
        </Button>
      </form>

      {suggestedAverage && (
        <div className="text-[11px] text-muted">
          Suggested average of {numericValues.length} numeric reading{numericValues.length > 1 ? "s" : ""}:{" "}
          <span className="font-semibold text-text">{suggestedAverage} {unit}</span> — enter the final reported result below.
        </div>
      )}
    </div>
  );
}
