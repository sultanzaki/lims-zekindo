import type { getKpiSummary } from "@/lib/analytics";

function severityColor(value: number | null, goodAt: number, warnAt: number): string {
  if (value === null) return "#0B0B0B";
  if (value >= goodAt) return "#1E7A34";
  if (value >= warnAt) return "#9A6100";
  return "#B00016";
}

function Tile({
  label,
  value,
  valueColor,
  sub,
}: {
  label: string;
  value: string;
  valueColor?: string;
  sub?: string;
}) {
  return (
    <div className="bg-white border border-border rounded-[16px] shadow-card-sm px-4 py-3.5 flex flex-col gap-1">
      <span className="text-[11px] font-semibold text-muted">{label}</span>
      <span className="text-[26px] font-bold tracking-tight leading-none" style={{ color: valueColor ?? "#0B0B0B" }}>
        {value}
      </span>
      {sub && <span className="text-[11px] text-faint mt-0.5">{sub}</span>}
    </div>
  );
}

export default function KpiTiles({ kpi }: { kpi: Awaited<ReturnType<typeof getKpiSummary>> }) {
  const deltaLabel =
    kpi.volumeDeltaPct === null ? "vs last month: n/a" : `${kpi.volumeDeltaPct >= 0 ? "+" : ""}${kpi.volumeDeltaPct}% vs last month`;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
      <Tile label="Samples this month" value={String(kpi.samplesThisMonth)} sub={deltaLabel} />
      <Tile
        label="TAT compliance (30d)"
        value={kpi.tatComplianceRate === null ? "—" : `${kpi.tatComplianceRate}%`}
        valueColor={severityColor(kpi.tatComplianceRate, 90, 75)}
      />
      <Tile
        label="Pass rate (30d)"
        value={kpi.passRate === null ? "—" : `${kpi.passRate}%`}
        valueColor={severityColor(kpi.passRate, 90, 75)}
      />
      <Tile
        label="Open & overdue"
        value={String(kpi.overdueOpenCount)}
        valueColor={kpi.overdueOpenCount > 0 ? "#B00016" : "#1E7A34"}
      />
      <Tile
        label="Equipment overdue"
        value={String(kpi.equipmentOverdue)}
        valueColor={kpi.equipmentOverdue > 0 ? "#B00016" : "#1E7A34"}
      />
      <Tile
        label="Reagent alerts"
        value={String(kpi.reagentAlertCount)}
        valueColor={kpi.reagentAlertCount > 0 ? "#9A6100" : "#1E7A34"}
      />
    </div>
  );
}
