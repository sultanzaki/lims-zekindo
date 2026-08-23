"use client";

import { useActionState, useState } from "react";
import { createSampleAction, type FormState } from "@/lib/actions/samples";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

const PRIORITIES = [
  { value: "Routine", label: "Routine" },
  { value: "Urgent", label: "Urgent" },
  { value: "STAT", label: "STAT" },
] as const;

export default function NewSampleForm({
  nextSampleId,
  defaultCollectedBy,
  sampleTypes,
}: {
  nextSampleId: string;
  defaultCollectedBy: string;
  sampleTypes: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createSampleAction, initialState);
  const [sampleTypeId, setSampleTypeId] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]["value"]>("Routine");

  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  const defaultDateTime = now.toISOString().slice(0, 16);

  return (
    <form action={formAction} className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-5">
      <div className="bg-primary-soft border border-[#C4E3F1] rounded-[13px] px-4 py-3.5 flex items-center justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold text-primary-dark tracking-wider uppercase">Sample ID</div>
          <div className="text-lg font-bold text-primary-dark font-mono-data mt-0.5 tracking-tight">
            {nextSampleId}
          </div>
        </div>
        <span className="text-xs text-primary-dark/80 text-right leading-snug">
          Auto-assigned
          <br />
          on save
        </span>
      </div>

      <Field label="Sample Name" htmlFor="name">
        <input
          id="name"
          name="name"
          type="text"
          required
          placeholder="e.g. Bottled Drinking Water 600ml"
          className={inputClass}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-semibold text-text">Sample type</label>
        <input type="hidden" name="sampleTypeId" value={sampleTypeId} />
        <div className="flex flex-wrap gap-2">
          {sampleTypes.map((opt) => {
            const active = sampleTypeId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSampleTypeId(opt.id)}
                className="text-[13px] font-semibold px-3.5 py-2.5 rounded-full border cursor-pointer min-h-[40px] transition-colors duration-150"
                style={{
                  background: active ? "#1A5F7A" : "#FFFFFF",
                  color: active ? "#ffffff" : "#444444",
                  borderColor: active ? "#1A5F7A" : "#E3EAEF",
                }}
              >
                {opt.name}
              </button>
            );
          })}
        </div>
        {sampleTypes.length === 0 && (
          <div className="text-[11px] text-danger">No sample types configured yet — ask an admin to add one under Catalog.</div>
        )}
        {state.error === "Select a sample type." && (
          <div className="text-[11px] text-danger">Select a sample type to continue.</div>
        )}
      </div>

      <Field label="Source / Location" htmlFor="source">
        <input id="source" name="source" type="text" placeholder="e.g. Production Line 2" className={inputClass} />
      </Field>

      <Field label="Collected By" htmlFor="collectedBy">
        <input id="collectedBy" name="collectedBy" type="text" defaultValue={defaultCollectedBy} className={inputClass} />
      </Field>

      <Field label="Collection Date & Time" htmlFor="collectedDate">
        <input
          id="collectedDate"
          name="collectedDate"
          type="datetime-local"
          defaultValue={defaultDateTime}
          className={inputClass}
        />
      </Field>

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-semibold text-text">Priority</label>
        <input type="hidden" name="priority" value={priority} />
        <div className="flex gap-2">
          {PRIORITIES.map((p) => {
            const active = priority === p.value;
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => setPriority(p.value)}
                className="flex-1 text-center text-[13px] font-semibold px-2 py-2.5 rounded-[10px] border cursor-pointer min-h-[44px] transition-colors duration-150"
                style={{
                  background: active ? "#1A5F7A" : "#FFFFFF",
                  color: active ? "#ffffff" : "#444444",
                  borderColor: active ? "#1A5F7A" : "#E3EAEF",
                }}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      <Field label="Storage Location (optional)" htmlFor="storageLocation">
        <input
          id="storageLocation"
          name="storageLocation"
          type="text"
          placeholder="e.g. Freezer 2 - Shelf B"
          className={inputClass}
        />
      </Field>

      {state.error && state.error !== "Select a sample type." && (
        <div className="text-xs font-medium text-danger">{state.error}</div>
      )}

      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Logging in…" : "Log Sample In"}
      </Button>
    </form>
  );
}
