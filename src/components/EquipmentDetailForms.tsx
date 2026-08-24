"use client";

import { useActionState, useRef } from "react";
import { changeEquipmentStatusAction, logCalibrationAction, logMaintenanceAction, type FormState } from "@/lib/actions/inventory";
import { inputClassSm } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};
const STATUS_OPTIONS = ["Operational", "Under Maintenance", "Out of Service"];

export function ChangeStatusForm({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [state, formAction, pending] = useActionState(changeEquipmentStatusAction, initialState);
  return (
    <form action={formAction} className="flex flex-col gap-2.5 bg-white border border-border rounded-[18px] shadow-card p-4">
      <div className="text-[13px] font-semibold text-text">Change Status</div>
      <input type="hidden" name="id" value={id} />
      <select name="status" defaultValue={currentStatus} className={inputClassSm}>
        {STATUS_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <input name="reason" placeholder="Reason / note (optional)" className={inputClassSm} />
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm" variant="secondary">
        {pending ? "Saving…" : "Update Status"}
      </Button>
    </form>
  );
}

export function LogCalibrationForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(logCalibrationAction, initialState);
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
      <div className="text-[13px] font-semibold text-text">Log Calibration</div>
      <input type="hidden" name="id" value={id} />
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Next calibration due</label>
          <input name="nextCalibrationDue" type="date" className={inputClassSm} />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] text-muted">Result / notes</label>
          <input name="result" placeholder="e.g. Pass, adjusted +0.2" className={inputClassSm} />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-muted">Certificate (optional)</label>
        <input
          name="certificate"
          type="file"
          accept="image/jpeg,image/png,image/webp,.pdf,application/pdf,.xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="text-xs"
        />
      </div>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm">
        {pending ? "Logging…" : "Log Calibration Done"}
      </Button>
    </form>
  );
}

export function LogMaintenanceForm({ id }: { id: string }) {
  const [state, formAction, pending] = useActionState(logMaintenanceAction, initialState);
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
      <div className="text-[13px] font-semibold text-text">Log Maintenance</div>
      <input type="hidden" name="id" value={id} />
      <input name="detail" placeholder="What was done" required className={inputClassSm} />
      <div className="flex flex-col gap-1">
        <label className="text-[11px] text-muted">Attachment (optional)</label>
        <input
          name="attachment"
          type="file"
          accept="image/jpeg,image/png,image/webp,.pdf,application/pdf,.xlsx,.xls,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          className="text-xs"
        />
      </div>
      {state.error && <div className="text-xs text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending} size="sm" variant="secondary">
        {pending ? "Logging…" : "Log Maintenance"}
      </Button>
    </form>
  );
}
