import { requirePageRole } from "@/lib/auth";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/format";
import BackHeader from "@/components/BackHeader";
import { CreateEquipmentForm, LogCalibrationForm } from "@/components/InventoryForms";
import { setEquipmentStatusAction } from "@/lib/actions/inventory";

const STATUS_OPTIONS = ["Operational", "Under Maintenance", "Out of Service"];
const STATUS_COLOR: Record<string, string> = {
  Operational: "#1e7a34",
  "Under Maintenance": "#a36a00",
  "Out of Service": "#D0021B",
};

export default async function EquipmentPage() {
  await requirePageRole(canManageInventoryAndCatalog);
  const equipment = await prisma.equipment.findMany({ orderBy: { name: "asc" } });
  const now = new Date().getTime();

  return (
    <div className="min-h-screen flex flex-col bg-surface">
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
                  <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: "#F0F4F8", color: STATUS_COLOR[e.status] }}>
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
          {equipment.length === 0 && <div className="text-xs text-muted">No equipment tracked yet.</div>}
        </div>
      </div>
    </div>
  );
}
