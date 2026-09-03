import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canViewAnalytics } from "@/lib/roles";
import { getTatPredictions, getResultAnomalies, getTechnicianPerformance } from "@/lib/bi";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import SectionLabel from "@/components/ui/SectionLabel";
import EmptyState from "@/components/ui/EmptyState";
import type { Metadata } from "next";

function Note({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] text-faint leading-relaxed -mt-1.5">{children}</p>;
}

export const metadata: Metadata = { title: "Advanced Insights" };

export default async function InsightsPage() {
  const user = await requirePageRole(canViewAnalytics);

  const [predictions, anomalies, technicians, unread] = await Promise.all([
    getTatPredictions(),
    getResultAnomalies(),
    getTechnicianPerformance(),
    getUnreadCount(user.id),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Advanced Insights" backHref="/analytics" />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-6 md:max-w-[720px] md:w-full">
        <section>
          <SectionLabel className="mb-1.5">TAT Prediction by Sample Type</SectionLabel>
          <Note>
            Estimated from each type&apos;s historical average turnaround (last 20 completed samples), scaled up when the
            lab&apos;s current open queue is heavier than usual. A statistical estimate, not a guarantee.
          </Note>
          <div className="mt-2.5 flex flex-col gap-2">
            {predictions.map((p) => (
              <div key={p.sampleType} className="bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text">{p.sampleType}</span>
                  <span className="text-sm font-bold text-primary font-mono-data">~{p.predictedHours}h</span>
                </div>
                <div className="text-[11px] text-muted mt-1">
                  Target {p.targetHours}h
                  {p.historicalAvgHours !== null && ` · Historical avg ${p.historicalAvgHours}h (n=${p.historicalSampleSize})`}
                  {p.historicalAvgHours === null && " · No completed history yet, using target"}
                  {" · "}
                  {p.currentOpenCount} open now
                  {p.loadFactor > 1 && ` · queue load ×${p.loadFactor}`}
                </div>
              </div>
            ))}
            {predictions.length === 0 && <EmptyState>No active sample types configured.</EmptyState>}
          </div>
        </section>

        <section>
          <SectionLabel className="mb-1.5">Result Anomalies (last 30 days)</SectionLabel>
          <Note>
            Flags a submitted result more than 2.5 standard deviations from that test&apos;s own historical mean — a
            statistical outlier check, worth a second look, not an automatic fail.
          </Note>
          <div className="mt-2.5 flex flex-col gap-2">
            {anomalies.map((a) => (
              <Link
                key={a.testId}
                href={`/samples/${a.sampleId}`}
                className="bg-white border border-warning/40 rounded-2xl shadow-card-sm px-3.5 py-3 block"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text">{a.testName}</span>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-warning-bg text-warning-dark whitespace-nowrap">
                    z = {a.zScore}
                  </span>
                </div>
                <div className="text-[11px] text-muted mt-1">
                  Result {a.result} {a.unit} · historical mean {a.mean} ± {a.stddev} {a.unit}
                </div>
                <div className="text-[11px] text-faint mt-0.5">
                  {a.sampleId} · {formatDateTime(a.submittedAt)}
                </div>
              </Link>
            ))}
            {anomalies.length === 0 && <EmptyState>No statistical outliers in the last 30 days.</EmptyState>}
          </div>
        </section>

        <section>
          <SectionLabel className="mb-1.5">Technician Performance (last 90 days)</SectionLabel>
          <Note>
            On-time rate compares each result&apos;s submission time to the sample&apos;s TAT deadline. Out-of-spec rate
            covers only tests with a comparable numeric/exact spec.
          </Note>
          <div className="mt-2.5 flex flex-col gap-2">
            {technicians.map((t) => (
              <div key={t.userId} className="bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-text">{t.name}</span>
                  <span className="text-[11px] text-muted">{t.testsSubmitted} test{t.testsSubmitted === 1 ? "" : "s"}</span>
                </div>
                <div className="flex items-center gap-4 mt-1.5">
                  <div className="text-[11px]">
                    <span className="text-faint">On-time </span>
                    <span
                      className="font-bold"
                      style={{ color: t.onTimeRate === null ? "#5B6B74" : t.onTimeRate >= 90 ? "#1E7A34" : t.onTimeRate >= 75 ? "#9A6100" : "#B00016" }}
                    >
                      {t.onTimeRate === null ? "—" : `${t.onTimeRate}%`}
                    </span>
                  </div>
                  <div className="text-[11px]">
                    <span className="text-faint">Out-of-spec </span>
                    <span
                      className="font-bold"
                      style={{ color: t.outOfSpecRate === null ? "#5B6B74" : t.outOfSpecRate <= 5 ? "#1E7A34" : t.outOfSpecRate <= 15 ? "#9A6100" : "#B00016" }}
                    >
                      {t.outOfSpecRate === null ? "—" : `${t.outOfSpecRate}%`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {technicians.length === 0 && <EmptyState>No results submitted in the last 90 days.</EmptyState>}
          </div>
        </section>
      </div>
    </div>
  );
}
