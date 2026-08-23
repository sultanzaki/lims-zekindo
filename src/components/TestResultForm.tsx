"use client";

import { useState } from "react";
import { useActionState } from "react";
import { submitTestResultAction, type FormState } from "@/lib/actions/samples";
import { parseSpecLimit, parseSpecVerdict } from "@/lib/spec";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

const QUALITATIVE_PAIRS: Record<string, [string, string]> = {
  negative: ["Negative", "Positive"],
  "no growth": ["No Growth", "Growth Detected"],
};

function qualitativeOptionsFor(spec: string): [string, string] | null {
  const limit = parseSpecLimit(spec);
  if (!limit || limit.kind !== "exact") return null;
  return QUALITATIVE_PAIRS[limit.value.toLowerCase()] ?? [limit.value, "Fail"];
}

const KEYS = ["7", "8", "9", "4", "5", "6", "1", "2", "3", "<", "0", "del"] as const;

export default function TestResultForm({
  sampleId,
  testId,
  unit,
  spec,
  isMulti = false,
}: {
  sampleId: string;
  testId: string;
  unit: string;
  spec: string;
  isMulti?: boolean;
}) {
  const [state, formAction, pending] = useActionState(submitTestResultAction, initialState);
  const [result, setResult] = useState("");

  const qualitative = qualitativeOptionsFor(spec);
  const verdict = parseSpecVerdict(spec, result || null);
  const liveBorder = verdict === "Fail" ? "#D0021B" : verdict === "Pass" ? "#28A745" : "#E3EAEF";
  const liveVerdictBg = verdict === "Fail" ? "#FDECEA" : "#E6F4EA";
  const liveVerdictColor = verdict === "Fail" ? "#B00016" : "#1E7A34";
  const liveVerdictLabel = verdict === "Fail" ? "Out of spec" : "In spec";

  function pressKey(k: (typeof KEYS)[number]) {
    setResult((r) => {
      if (k === "del") return r.slice(0, -1);
      if (k === "<") return r.startsWith("<") ? r.slice(1) : "<" + r;
      return (r === "0" ? "" : r) + k;
    });
  }

  return (
    <form action={formAction} className="flex-1 flex flex-col">
      <input type="hidden" name="sampleId" value={sampleId} />
      <input type="hidden" name="testId" value={testId} />
      <input type="hidden" name="result" value={result} />

      <div className="px-5 pt-4.5 flex flex-col gap-3.5">
        <div
          className="bg-white border-[1.5px] rounded-[14px] px-4 py-4 flex items-center justify-between gap-3 transition-colors duration-200"
          style={{ borderColor: liveBorder }}
        >
          <div className="min-w-0 flex-1">
            <div className="text-[11px] text-faint tracking-wide uppercase font-semibold">
              {isMulti ? "Final reported value" : "Measured value"}
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <span
                className="text-[32px] font-bold font-mono-data leading-none"
                style={{ color: result ? "#111111" : "#C2D2DB" }}
              >
                {result || "—"}
              </span>
              {unit && <span className="text-sm text-muted font-medium">{unit}</span>}
            </div>
          </div>
          {verdict && (
            <span
              className="text-[13px] font-bold px-3.5 py-1.5 rounded-full whitespace-nowrap shrink-0"
              style={{ background: liveVerdictBg, color: liveVerdictColor }}
            >
              {liveVerdictLabel}
            </span>
          )}
        </div>

        {qualitative ? (
          <div className="flex gap-2.5">
            {qualitative.map((opt) => {
              const active = result === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setResult(opt)}
                  className="flex-1 text-center text-sm font-semibold px-2 py-3.5 rounded-xl border-[1.5px] cursor-pointer min-h-[50px] transition-colors duration-150"
                  style={{
                    background: active ? "#2B8DB8" : "#FFFFFF",
                    color: active ? "#ffffff" : "#444444",
                    borderColor: active ? "#2B8DB8" : "#E3EAEF",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : null}

        <Field label="Notes (optional)" htmlFor="notes">
          <textarea
            id="notes"
            name="notes"
            rows={3}
            placeholder="Observations, deviations…"
            className={`${inputClass} resize-none`}
          />
        </Field>
      </div>

      {!qualitative && (
        <div className="mt-4 bg-[#EDF3F7] border-t border-[#E2EBF0] px-3.5 pt-3.5 pb-2">
          <div className="grid grid-cols-3 gap-2">
            {KEYS.map((k) => {
              const isAction = k === "del" || k === "<";
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => pressKey(k)}
                  className="flex items-center justify-center h-[54px] rounded-[13px] border text-xl font-semibold font-mono-data cursor-pointer select-none transition-transform duration-100 active:scale-[0.93]"
                  style={{
                    background: isAction ? "#DCE8EE" : "#FFFFFF",
                    borderColor: isAction ? "#CBDCE5" : "#E4EDF2",
                    color: isAction ? "#0F4C63" : "#111111",
                    boxShadow: "0 1px 2px rgba(16,42,58,0.07)",
                  }}
                >
                  {k === "del" ? "⌫" : k}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`px-5 pb-7 pt-3 ${!qualitative ? "bg-[#EDF3F7]" : ""}`}>
        {state.error && <div className="text-xs font-medium text-danger mb-3">{state.error}</div>}
        <Button type="submit" disabled={pending || !result}>
          {pending ? "Submitting…" : "Submit for QA Review"}
        </Button>
      </div>
    </form>
  );
}
