"use client";

import { exportToExcel } from "@/lib/exportExcel";

type Props = {
  kpi: {
    samplesThisMonth: number;
    volumeDeltaPct: number | null;
    tatComplianceRate: number | null;
    passRate: number | null;
    overdueOpenCount: number;
    equipmentOverdue: number;
    reagentAlertCount: number;
  };
  volumeTrend: { date: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  passRejectTrend: { week: string; approved: number; rejected: number }[];
  volumeByType: { label: string; count: number }[];
  volumeByBu: { label: string; count: number }[];
  tatByType: { type: string; onTime: number; late: number; total: number }[];
  deviationTrend: { week: string; count: number }[];
  equipmentHealth: { operational: number; underMaintenance: number; outOfService: number };
  reagentHealth: { ok: number; expiringSoon: number; lowStock: number; expired: number };
};

export default function AnalyticsExportBar(props: Props) {
  function handleExportExcel() {
    exportToExcel(`analytics-export-${new Date().toISOString().slice(0, 10)}.xlsx`, [
      {
        name: "KPI Summary",
        rows: [
          {
            "Samples This Month": props.kpi.samplesThisMonth,
            "Volume Change %": props.kpi.volumeDeltaPct ?? "",
            "TAT Compliance %": props.kpi.tatComplianceRate ?? "",
            "Pass Rate %": props.kpi.passRate ?? "",
            "Overdue Open Samples": props.kpi.overdueOpenCount,
            "Equipment Overdue": props.kpi.equipmentOverdue,
            "Reagent Alerts": props.kpi.reagentAlertCount,
          },
        ],
      },
      { name: "Volume Trend", rows: props.volumeTrend.map((r) => ({ Date: r.date, Samples: r.count })) },
      { name: "Status Distribution", rows: props.statusDistribution.map((r) => ({ Status: r.status, Count: r.count })) },
      {
        name: "Pass Reject Trend",
        rows: props.passRejectTrend.map((r) => ({ Week: r.week, Approved: r.approved, Rejected: r.rejected })),
      },
      { name: "Volume by Sample Type", rows: props.volumeByType.map((r) => ({ Type: r.label, Count: r.count })) },
      { name: "Volume by Business Unit", rows: props.volumeByBu.map((r) => ({ "Business Unit": r.label, Count: r.count })) },
      {
        name: "TAT Compliance by Type",
        rows: props.tatByType.map((r) => ({ Type: r.type, "On Time": r.onTime, Late: r.late, Total: r.total })),
      },
      { name: "Deviation Trend", rows: props.deviationTrend.map((r) => ({ Week: r.week, Count: r.count })) },
      {
        name: "Equipment Health",
        rows: [
          {
            Operational: props.equipmentHealth.operational,
            "Under Maintenance": props.equipmentHealth.underMaintenance,
            "Out of Service": props.equipmentHealth.outOfService,
          },
        ],
      },
      {
        name: "Reagent Health",
        rows: [
          {
            OK: props.reagentHealth.ok,
            "Expiring Soon": props.reagentHealth.expiringSoon,
            "Low Stock": props.reagentHealth.lowStock,
            Expired: props.reagentHealth.expired,
          },
        ],
      },
    ]);
  }

  return (
    <div className="no-print flex items-center gap-2 self-end">
      <button
        type="button"
        onClick={handleExportExcel}
        className="text-xs font-semibold text-primary px-2.5 py-1.5 rounded-full border border-border bg-white cursor-pointer"
      >
        Export Excel
      </button>
      <button
        type="button"
        onClick={() => window.print()}
        className="text-xs font-semibold text-primary px-2.5 py-1.5 rounded-full border border-border bg-white cursor-pointer"
      >
        Export PDF
      </button>
    </div>
  );
}
