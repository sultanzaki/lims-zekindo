import Link from "next/link";
import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canViewAnalytics } from "@/lib/roles";
import {
  getKpiSummary,
  getVolumeTrend,
  getStatusDistribution,
  getPassRejectTrend,
  getVolumeBySampleType,
  getVolumeByBusinessUnit,
  getTatComplianceByType,
  getDeviationTrend,
  getEquipmentHealth,
  getReagentHealth,
} from "@/lib/analytics";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import KpiTiles from "@/components/analytics/KpiTiles";
import {
  SampleVolumeTrend,
  VolumeByCategoryBar,
  StatusDistributionBar,
  PassRejectTrend,
  TatComplianceByType,
  DeviationTrend,
  EquipmentHealthMeter,
  ReagentHealthMeter,
} from "@/components/analytics/Charts";

export default async function AnalyticsPage() {
  const user = await requirePageRole(canViewAnalytics);

  const [
    kpi,
    volumeTrend,
    statusDistribution,
    passRejectTrend,
    volumeByType,
    volumeByBu,
    tatByType,
    deviationTrend,
    equipmentHealth,
    reagentHealth,
    unread,
  ] = await Promise.all([
    getKpiSummary(),
    getVolumeTrend(30),
    getStatusDistribution(),
    getPassRejectTrend(12),
    getVolumeBySampleType(6),
    getVolumeByBusinessUnit(6),
    getTatComplianceByType(),
    getDeviationTrend(12),
    getEquipmentHealth(),
    getReagentHealth(),
    getUnreadCount(user.id),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-64">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Analytics" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-3.5 md:max-w-[1100px] md:mx-auto md:w-full">
        <Link
          href="/analytics/insights"
          className="flex items-center justify-between gap-2 bg-white border border-border rounded-[16px] shadow-card-sm px-4 py-3"
        >
          <div>
            <div className="text-sm font-semibold text-text">Advanced Insights</div>
            <div className="text-[11px] text-muted mt-0.5">TAT prediction, result anomalies, technician performance</div>
          </div>
          <svg width="8" height="14" viewBox="0 0 8 14" className="shrink-0">
            <path d="M1 1l6 6-6 6" stroke="#C2D2DB" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>

        <KpiTiles kpi={kpi} />
        <div className="flex flex-col gap-3.5 md:grid md:grid-cols-2 md:gap-4 md:items-start">
          <SampleVolumeTrend data={volumeTrend} />
          <PassRejectTrend data={passRejectTrend} />
          <TatComplianceByType data={tatByType} />
          <StatusDistributionBar data={statusDistribution} />
          <VolumeByCategoryBar title="Volume by sample type" subtitle="Received samples, all time" data={volumeByType} />
          <VolumeByCategoryBar title="Volume by business unit" subtitle="Received samples, all time" data={volumeByBu} />
          <DeviationTrend data={deviationTrend} />
          <EquipmentHealthMeter
            operational={equipmentHealth.operational}
            underMaintenance={equipmentHealth.underMaintenance}
            outOfService={equipmentHealth.outOfService}
          />
          <ReagentHealthMeter
            ok={reagentHealth.ok}
            expiringSoon={reagentHealth.expiringSoon}
            lowStock={reagentHealth.lowStock}
            expired={reagentHealth.expired}
          />
        </div>
      </div>
    </div>
  );
}
