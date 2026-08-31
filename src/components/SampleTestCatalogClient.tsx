"use client";

import { useMemo, useState } from "react";
import { CreateSampleTypeForm, CreateTestCatalogForm } from "@/components/CatalogForms";
import StatChip from "@/components/ui/StatChip";
import { setSampleTypeActiveAction, setTestCatalogActiveAction } from "@/lib/actions/catalog";

export type TestRow = {
  id: string;
  name: string;
  spec: string;
  active: boolean;
  resultMode: string;
  replicateCount: number | null;
  intervalPlan: string | null;
};

export type SampleTypeRow = {
  id: string;
  name: string;
  active: boolean;
  targetTatHours: number;
  retentionDays: number;
  tests: TestRow[];
};

export default function SampleTestCatalogClient({ sampleTypes }: { sampleTypes: SampleTypeRow[] }) {
  const [search, setSearch] = useState("");
  const [sampleTypeFormOpen, setSampleTypeFormOpen] = useState(false);
  const [testFormOpen, setTestFormOpen] = useState(false);

  const stats = useMemo(() => {
    const totalTests = sampleTypes.reduce((sum, st) => sum + st.tests.length, 0);
    const activeTests = sampleTypes.reduce((sum, st) => sum + st.tests.filter((t) => t.active).length, 0);
    const inactiveTypes = sampleTypes.filter((st) => !st.active).length;
    return { totalTests, activeTests, inactiveTypes };
  }, [sampleTypes]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return sampleTypes;
    return sampleTypes.filter(
      (st) => st.name.toLowerCase().includes(q) || st.tests.some((t) => t.name.toLowerCase().includes(q))
    );
  }, [sampleTypes, search]);

  return (
    <div className="flex-1 px-5 md:px-9 pt-4.5 md:pt-7 pb-7 md:pb-9 flex flex-col gap-4 md:gap-5 md:max-w-[1300px] md:w-full">
      {/* Desktop header + toolbar */}
      <div className="hidden md:flex md:items-start md:justify-between md:gap-6 md:pr-10">
        <div>
          <div className="text-[20px] font-bold text-text tracking-tight">Sample &amp; Test Catalog</div>
          <div className="text-[13px] text-muted mt-0.5">
            {sampleTypes.length} sample types &middot; {stats.totalTests} tests defined
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2 h-[38px] px-3 rounded-[10px] bg-white border border-border w-[220px]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#93A6B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sample types or tests…"
              className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
            />
          </div>
          <button
            type="button"
            onClick={() => setTestFormOpen((v) => !v)}
            className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] bg-white border border-border text-[13px] font-semibold text-primary-dark cursor-pointer whitespace-nowrap"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {testFormOpen ? "Close" : "Add Test"}
          </button>
          <button
            type="button"
            onClick={() => setSampleTypeFormOpen((v) => !v)}
            className="flex items-center gap-1.5 h-[38px] px-4 rounded-[10px] bg-primary text-white text-[13px] font-semibold shadow-glow-primary cursor-pointer whitespace-nowrap"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {sampleTypeFormOpen ? "Close" : "Add Sample Type"}
          </button>
        </div>
      </div>

      {(sampleTypeFormOpen || testFormOpen) && (
        <div className="hidden md:grid md:grid-cols-2 md:gap-4 md:items-start">
          {sampleTypeFormOpen && <CreateSampleTypeForm />}
          {testFormOpen && <CreateTestCatalogForm sampleTypes={sampleTypes.map((s) => ({ id: s.id, name: s.name }))} />}
        </div>
      )}

      {/* Mobile: always-visible create forms (unchanged) */}
      <div className="flex flex-col gap-4 md:hidden">
        <CreateSampleTypeForm />
        <CreateTestCatalogForm sampleTypes={sampleTypes.map((s) => ({ id: s.id, name: s.name }))} />
      </div>

      {/* Desktop stat strip */}
      <div className="hidden md:flex md:gap-2.5">
        <StatChip label="Sample types" value={sampleTypes.length} />
        <StatChip label="Total tests" value={stats.totalTests} />
        <StatChip label="Active tests" value={stats.activeTests} dotColor="#28A745" />
        <StatChip label="Inactive types" value={stats.inactiveTypes} dotColor="#D0021B" />
      </div>

      {/* Mobile card grid: unfiltered, unchanged */}
      <div className="flex flex-col gap-3 md:hidden">
        {sampleTypes.map((st) => (
          <SampleTypeCard key={st.id} st={st} />
        ))}
        {sampleTypes.length === 0 && <div className="text-xs text-muted">No sample types yet — add one above.</div>}
      </div>

      {/* Desktop card grid: filtered by search */}
      <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:items-start">
        {filtered.map((st) => (
          <SampleTypeCard key={st.id} st={st} />
        ))}
        {filtered.length === 0 && (
          <div className="md:col-span-full text-xs text-muted">
            {sampleTypes.length === 0 ? "No sample types yet — add one above." : "No sample types or tests match your search."}
          </div>
        )}
      </div>
    </div>
  );
}

function SampleTypeCard({ st }: { st: SampleTypeRow }) {
  return (
    <div className="bg-white border border-border rounded-2xl shadow-card-sm p-3.5">
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="text-[13px] font-semibold text-text">
          {st.name} {!st.active && <span className="text-danger font-normal">(inactive)</span>}
        </div>
        <form action={setSampleTypeActiveAction.bind(null, st.id, !st.active)}>
          <button type="submit" className={`text-[11px] font-semibold cursor-pointer ${st.active ? "text-danger" : "text-success-dark"}`}>
            {st.active ? "Deactivate" : "Reactivate"}
          </button>
        </form>
      </div>
      <div className="text-[11px] text-muted mb-2">
        TAT {st.targetTatHours}h &middot; Retention {st.retentionDays}d
      </div>
      <div className="flex flex-col gap-1.5">
        {st.tests.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 text-xs border-t border-border-soft pt-1.5">
            <div>
              <span className={`font-medium ${t.active ? "text-text" : "text-muted line-through"}`}>{t.name}</span>
              <span className="text-muted"> &middot; {t.spec}</span>
              {t.resultMode === "MULTI" && (
                <span className="ml-1.5 inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary-soft text-primary-dark align-middle">
                  {[t.replicateCount ? `×${t.replicateCount}` : null, t.intervalPlan ? t.intervalPlan.split(",").length + " pts" : null]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              )}
            </div>
            <form action={setTestCatalogActiveAction.bind(null, t.id, !t.active)}>
              <button type="submit" className={`text-[11px] font-semibold cursor-pointer shrink-0 ${t.active ? "text-danger" : "text-success-dark"}`}>
                {t.active ? "Deactivate" : "Reactivate"}
              </button>
            </form>
          </div>
        ))}
        {st.tests.length === 0 && <div className="text-xs text-muted">No tests defined yet.</div>}
      </div>
    </div>
  );
}
