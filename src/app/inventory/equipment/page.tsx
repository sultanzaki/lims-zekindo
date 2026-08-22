import { requirePageRole } from "@/lib/auth";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import { CreateEquipmentForm, LogCalibrationForm } from "@/components/InventoryForms";
import { setEquipmentStatusAction } from "@/lib/actions/inventory";
import EmptyState from "@/components/ui/EmptyState";

const STATUS_OPTIONS = ["Operational", "Under Maintenance", "Out of Service"];
const STATUS_COLOR: Record<string, string> = {
  Operational: "#146638",
  "Under Maintenance": "#B3720C",
  "Out of Service": "#C22233",
};

export default async function EquipmentPage() {
  await requirePageRole(canManageInventoryAndCatalog);
  const equipment = await prisma.equipment.findMany({ orderBy: { name: "asc" } });
  const now = new Date().getTime();

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <BackHeader title="Equipment" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7 flex flex-col gap-4">
        <CreateEquipmentForm />

        <div className="flex flex-col gap-2">
          {equipment.map((e) => {
            const overdue = e.nextCalibrationDue && e.nextCalibrationDue.getTime() < now;
            return (
              <div key={e.id} className="bg-white border border-border rounded-xl p-3.5">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="text-[13px] font-semibold text-text">{e.name}</div>
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-[6px]" style={{ background: "#EFF2F5", color: STATUS_COLOR[e.status] }}>
                    {e.status}
                  </span>
                </div>
                <div className="text-[11px] text-muted mb-1.5">
                  {e.assetTag} {e.location && `· ${e.location}`}
                  {e.nextCalibrationDue && (
                    <span className={overdue ? "text-danger font-semibold" : ""}>
                      {" "}· Calibration due {formatDateTime(e.nextCalibrationDue)} {overdue && "(overdue)"}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {STATUS_OPTIONS.filter((s) => s !== e.status).map((s) => (
                    <form key={s} action={setEquipmentStatusAction.bind(null, e.id, s)}>
                      <button type="submit" className="text-[11px] font-semibold text-primary cursor-pointer">
                        Mark {s}
                      </button>
                    </form>
                  ))}
                </div>
                <LogCalibrationForm id={e.id} />
              </div>
            );
          })}
          {equipment.length === 0 && <EmptyState>No equipment tracked yet.</EmptyState>}
        </div>
      </div>
    </div>
  );
}
