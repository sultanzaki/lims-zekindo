"use client";

import { useState } from "react";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

// Access codes are stored/verified without punctuation (see normalizeAccessCode
// in lib/tracking) — the dashes here are purely a typing aid, formatted back
// out the same way the lab prints/shares the code (e.g. K7XQ-2MNP).
function formatAccessCodeInput(raw: string): string {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return clean.match(/.{1,4}/g)?.join("-") ?? clean;
}

export default function TrackLookupForm({ showError }: { showError?: boolean }) {
  const [id, setId] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      method="GET"
      action="/track"
      onSubmit={() => setSubmitting(true)}
      className="flex flex-col gap-4 bg-white rounded-[16px] shadow-card-sm p-6 border border-border"
    >
      <div>
        <div className="text-[19px] font-bold text-text mb-1 tracking-tight">Track your sample</div>
        <div className="text-[13px] text-muted leading-relaxed">
          Enter the Sample ID and Access Code provided by the lab to see its status.
        </div>
      </div>

      <Field label="Sample ID" htmlFor="id">
        <input
          id="id"
          name="id"
          type="text"
          placeholder="e.g. LAB-24-0142"
          required
          autoCapitalize="characters"
          autoComplete="off"
          value={id}
          onChange={(e) => setId(e.target.value.toUpperCase())}
          className={`${inputClass} font-mono-data tracking-wide`}
        />
      </Field>

      <Field label="Access Code" htmlFor="code">
        <input
          id="code"
          name="code"
          type="text"
          placeholder="e.g. K7XQ-2MNP"
          required
          autoCapitalize="characters"
          autoComplete="off"
          value={code}
          onChange={(e) => setCode(formatAccessCodeInput(e.target.value))}
          maxLength={9}
          className={`${inputClass} font-mono-data tracking-wide`}
        />
      </Field>

      {showError && (
        <div className="flex items-start gap-2 bg-danger-bg border border-danger/20 rounded-[12px] px-3.5 py-3 -mt-1">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-danger shrink-0 mt-0.5">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="13" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <div className="text-xs font-medium text-danger leading-relaxed">
            Sample ID or Access Code is incorrect. Please check and try again.
          </div>
        </div>
      )}

      <Button type="submit" disabled={submitting} className="mt-1">
        {submitting ? "Looking up…" : "Track Sample"}
      </Button>
    </form>
  );
}
