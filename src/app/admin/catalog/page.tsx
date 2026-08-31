import { requirePageRole } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import { canManageInventoryAndCatalog } from "@/lib/roles";
import { prisma } from "@/lib/db";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import { CreateSampleTypeForm, CreateTestCatalogForm } from "@/components/CatalogForms";
import { setSampleTypeActiveAction, setTestCatalogActiveAction } from "@/lib/actions/catalog";

export default async function AdminCatalogPage() {
  const user = await requirePageRole(canManageInventoryAndCatalog);
  const [sampleTypes, unread] = await Promise.all([
    prisma.sampleTypeCatalog.findMany({
      orderBy: { name: "asc" },
      include: { tests: { orderBy: { order: "asc" } } },
    }),
    getUnreadCount(user.id),
  ]);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Sample & Test Catalog" backHref="/profile" />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 flex flex-col gap-4 md:max-w-[1300px] md:w-full">
        <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:items-start">
          <CreateSampleTypeForm />
          <CreateTestCatalogForm sampleTypes={sampleTypes.map((s) => ({ id: s.id, name: s.name }))} />
        </div>

        <div className="flex flex-col gap-3 md:grid md:grid-cols-2 lg:grid-cols-3 md:items-start">
          {sampleTypes.map((st) => (
            <div key={st.id} className="bg-white border border-border rounded-2xl shadow-card-sm p-3.5">
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
                TAT {st.targetTatHours}h · Retention {st.retentionDays}d
              </div>
              <div className="flex flex-col gap-1.5">
                {st.tests.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 text-xs border-t border-border-soft pt-1.5">
                    <div>
                      <span className={`font-medium ${t.active ? "text-text" : "text-muted line-through"}`}>{t.name}</span>
                      <span className="text-muted"> · {t.spec}</span>
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
          ))}
          {sampleTypes.length === 0 && <div className="text-xs text-muted">No sample types yet — add one above.</div>}
        </div>
      </div>
    </div>
  );
}
