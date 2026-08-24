import { requirePageRole } from "@/lib/auth";
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
  await requirePageRole(canViewAnalytics);

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
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <BackHeader title="Analytics" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-3.5 md:max-w-[1100px] md:mx-auto md:w-full">
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
