"use client";

import { useActionState, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createSampleAction, findRecentSimilarSamplesAction, type FormState } from "@/lib/actions/samples";
import { nowAsJakartaLocalInput } from "@/lib/tz";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: FormState = {};

const PRIORITIES = [
  { value: "Routine", label: "Routine" },
  { value: "Urgent", label: "Urgent" },
  { value: "STAT", label: "STAT" },
] as const;

type TestCatalogOption = { id: string; name: string; spec: string; sampleTypeId: string; sampleTypeName: string };
type TestPanelOption = { id: string; name: string; testCatalogIds: string[] };

export default function NewSampleForm({
  nextSampleId,
  defaultCollectedBy,
  defaultRequestor,
  sampleTypes,
  businessUnits,
  testCatalog,
  testPanels,
}: {
  nextSampleId: string;
  defaultCollectedBy: string;
  defaultRequestor: string;
  sampleTypes: { id: string; name: string; tests: { id: string }[] }[];
  businessUnits: { id: string; name: string }[];
  testCatalog: TestCatalogOption[];
  testPanels: TestPanelOption[];
}) {
  const [state, formAction, pending] = useActionState(createSampleAction, initialState);
  const [sampleTypeId, setSampleTypeId] = useState("");
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]["value"]>("Routine");
  const [extraTestIds, setExtraTestIds] = useState<string[]>([]);
  const [testSearch, setTestSearch] = useState("");
  const [panelToAdd, setPanelToAdd] = useState("");
  const [name, setName] = useState("");
  const [similarSamples, setSimilarSamples] = useState<Awaited<ReturnType<typeof findRecentSimilarSamplesAction>>>([]);
  const dupCheckSeq = useRef(0);

  // Live duplicate warning: after the user pauses typing in the name field,
  // ask the server for recently-logged samples with a similar name and show
  // them under the field so a repeat login is caught before submit.
  useEffect(() => {
    const q = name.trim();
    if (q.length < 3) {
      setSimilarSamples([]);
      return;
    }
    const seq = ++dupCheckSeq.current;
    const handle = setTimeout(async () => {
      try {
        const rows = await findRecentSimilarSamplesAction({ name: q });
        if (dupCheckSeq.current === seq) setSimilarSamples(rows);
      } catch {
        // ignore — duplicate check is a nicety, never blocks the form
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [name]);

  const defaultTestIds = new Set(sampleTypes.find((s) => s.id === sampleTypeId)?.tests.map((t) => t.id) ?? []);
  const extraTestIdSet = new Set(extraTestIds);
  const testById = new Map(testCatalog.map((t) => [t.id, t]));

  const testSearchResults =
    testSearch.trim().length > 0
      ? testCatalog
          .filter((t) => !defaultTestIds.has(t.id) && !extraTestIdSet.has(t.id))
          .filter((t) => t.name.toLowerCase().includes(testSearch.trim().toLowerCase()) || t.sampleTypeName.toLowerCase().includes(testSearch.trim().toLowerCase()))
          .slice(0, 8)
      : [];

  function addExtraTest(id: string) {
    if (defaultTestIds.has(id) || extraTestIdSet.has(id)) return;
    setExtraTestIds((prev) => [...prev, id]);
    setTestSearch("");
  }

  function removeExtraTest(id: string) {
    setExtraTestIds((prev) => prev.filter((x) => x !== id));
  }

  function addPanel() {
    const panel = testPanels.find((p) => p.id === panelToAdd);
    if (!panel) return;
    setExtraTestIds((prev) => {
      const next = new Set(prev);
      for (const id of panel.testCatalogIds) {
        if (!defaultTestIds.has(id)) next.add(id);
      }
      return Array.from(next);
    });
    setPanelToAdd("");
  }

  const defaultDateTime = nowAsJakartaLocalInput();

  return (
    <form
      action={formAction}
      className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-5 md:pt-8 md:max-w-[760px] md:w-full"
    >
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
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Bottled Drinking Water 600ml"
          className={inputClass}
        />
        {similarSamples.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5 rounded-[10px] border border-warning/40 bg-warning-bg px-3 py-2">
            <div className="text-[11px] font-semibold text-warning-dark">
              Similar samples logged in the last 7 days — double-check this isn&rsquo;t a repeat login:
            </div>
            {similarSamples.map((s) => (
              <Link
                key={s.id}
                href={`/samples/${s.id}`}
                className="text-[11px] text-warning-dark underline underline-offset-2 truncate"
              >
                {s.id} · {s.name ?? s.type}
              </Link>
            ))}
          </div>
        )}
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

      <div className="flex flex-col gap-2">
        <label className="text-[13px] font-semibold text-text">Additional tests (optional)</label>
        <div className="text-[11px] text-muted -mt-1">
          The sample type&rsquo;s default tests are always included — add extra tests here or quick-add a panel.
        </div>

        {testPanels.length > 0 && (
          <div className="flex items-center gap-2">
            <select value={panelToAdd} onChange={(e) => setPanelToAdd(e.target.value)} className={`${inputClass} flex-1`}>
              <option value="">Quick-add a panel…</option>
              {testPanels.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={addPanel}
              disabled={!panelToAdd}
              className="text-[13px] font-semibold px-3.5 py-2.5 rounded-[10px] border border-border bg-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
            >
              Add
            </button>
          </div>
        )}

        <div className="relative">
          <input
            value={testSearch}
            onChange={(e) => setTestSearch(e.target.value)}
            placeholder="Search tests to add…"
            className={inputClass}
          />
          {testSearchResults.length > 0 && (
            <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-border rounded-[10px] shadow-card-sm overflow-hidden">
              {testSearchResults.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => addExtraTest(t.id)}
                  className="w-full text-left px-3.5 py-2 text-[13px] hover:bg-chip-bg cursor-pointer border-b border-border-soft last:border-b-0"
                >
                  <span className="font-medium text-text">{t.name}</span>
                  <span className="text-muted"> &middot; {t.sampleTypeName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {extraTestIds.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {extraTestIds.map((id) => {
              const t = testById.get(id);
              if (!t) return null;
              return (
                <span key={id} className="inline-flex items-center gap-1.5 text-[12px] font-medium px-2.5 py-1 rounded-full bg-primary-soft text-primary-dark">
                  <input type="hidden" name="extraTestIds" value={id} />
                  {t.name}
                  <button type="button" onClick={() => removeExtraTest(id)} className="text-primary-dark/70 hover:text-primary-dark cursor-pointer font-bold">
                    ×
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-5">
        <Field label="Source / Location" htmlFor="source">
          <input id="source" name="source" type="text" placeholder="e.g. Production Line 2" className={inputClass} />
        </Field>

        <Field label="Requestor" htmlFor="requestorName">
          <input
            id="requestorName"
            name="requestorName"
            type="text"
            defaultValue={defaultRequestor}
            placeholder="Who requested this testing"
            className={inputClass}
          />
        </Field>
      </div>

      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-5">
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-semibold text-text">Business Unit</label>
          <select name="businessUnitId" defaultValue="" className={inputClass}>
            <option value="">Not specified</option>
            {businessUnits.map((bu) => (
              <option key={bu.id} value={bu.id}>
                {bu.name}
              </option>
            ))}
          </select>
          {businessUnits.length === 0 && (
            <div className="text-[11px] text-faint">No business units configured yet — ask an admin to add one under Catalog.</div>
          )}
        </div>

        <Field label="Collected By" htmlFor="collectedBy">
          <input id="collectedBy" name="collectedBy" type="text" defaultValue={defaultCollectedBy} className={inputClass} />
        </Field>
      </div>

      <div className="flex flex-col gap-5 md:grid md:grid-cols-2 md:gap-x-4 md:gap-y-5">
        <Field label="Collection Date & Time (WIB)" htmlFor="collectedDate">
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

      <div className="md:flex md:justify-end">
        <Button type="submit" disabled={pending} className="mt-1 md:mt-0 md:w-auto md:px-8">
          {pending ? "Logging in…" : "Log Sample In"}
        </Button>
      </div>
    </form>
  );
}
