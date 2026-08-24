"use client";

import { useActionState, useRef, useState } from "react";
import { recordReagentTransactionAction, type FormState } from "@/lib/actions/inventory";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

const TX_TYPES = [
  { value: "RECEIVED", label: "Receive stock" },
  { value: "CONSUMED", label: "Consume / use" },
  { value: "ADJUSTED", label: "Adjust to new count" },
  { value: "DISPOSED", label: "Dispose" },
] as const;

export function ReagentTransactionForm({ id, quantity, unit }: { id: string; quantity: number; unit: string }) {
  const [state, formAction, pending] = useActionState(recordReagentTransactionAction, initialState);
  const [type, setType] = useState<(typeof TX_TYPES)[number]["value"]>("RECEIVED");
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={(formData) => {
        formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-2.5 bg-white border border-border rounded-[18px] shadow-card p-4"
    >
      <div className="text-[13px] font-semibold text-text">Record Stock Movement</div>
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Type</label>
          <select name="type" value={type} onChange={(e) => setType(e.target.value as typeof type)} className={inputClassSm}>
            {TX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">{type === "ADJUSTED" ? `New count (${unit})` : `Amount (${unit})`}</label>
          <input
            name="amount"
            type="number"
            step="any"
            min={0}
            defaultValue={type === "ADJUSTED" ? quantity : undefined}
            required
            className={inputClassSm}
          />
        </div>
      </div>
      <input name="reason" placeholder="Reason / reference (optional)" className={inputClassSm} />
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Saving…" : "Record"}
      </Button>
    </form>
  );
}
