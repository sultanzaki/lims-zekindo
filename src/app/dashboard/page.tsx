import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData, getUnreadCount } from "@/lib/data";
import { canReviewAsSupervisor, canManageInventoryAndCatalog } from "@/lib/roles";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import MobileTopBar from "@/components/MobileTopBar";
import Card from "@/components/ui/Card";

type QuickAction = { href: string; label: string; icon: React.ReactNode };

const ICON_NEW_SAMPLE = (
  <>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </>
);
const ICON_SCAN = (
  <>
    <path d="M4 8V5a1 1 0 011-1h3" />
    <path d="M20 8V5a1 1 0 00-1-1h-3" />
    <path d="M4 16v3a1 1 0 001 1h3" />
    <path d="M20 16v3a1 1 0 01-1 1h-3" />
    <path d="M4 12h16" />
  </>
);
const ICON_REAGENTS = (
  <>
    <path d="M4 7l8-4 8 4v10l-8 4-8-4z" />
    <path d="M4 7l8 4 8-4" />
    <path d="M12 11v10" />
  </>
);
const ICON_EQUIPMENT = (
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8" />
    <path d="M12 16v4" />
    <path d="M7 11.5l3-3 2.5 2.5L17 7" />
  </>
);
const ICON_TASKS = (
  <>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
  </>
);
const ICON_DEVIATIONS = (
  <>
    <path d="M12 4.5L21 20H3z" />
    <path d="M12 10.5v4" />
    <path d="M12 17.4h.01" />
  </>
);
const ICON_ALERTS = (
  <>
    <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </>
);

function quickActionsFor(role: string): QuickAction[] {
  const actions: QuickAction[] = [
    { href: "/samples/new", label: "Log sample", icon: ICON_NEW_SAMPLE },
    { href: "/scan", label: "Scan label", icon: ICON_SCAN },
  ];
  if (canManageInventoryAndCatalog(role)) {
    actions.push({ href: "/inventory/reagents", label: "Reagents", icon: ICON_REAGENTS });
    actions.push({ href: "/inventory/equipment", label: "Equipment", icon: ICON_EQUIPMENT });
  } else if (canReviewAsSupervisor(role)) {
    actions.push({ href: "/deviations", label: "Deviations", icon: ICON_DEVIATIONS });
    actions.push({ href: "/samples", label: "My tasks", icon: ICON_TASKS });
  } else {
    actions.push({ href: "/samples", label: "My tasks", icon: ICON_TASKS });
    actions.push({ href: "/notifications", label: "Alerts", icon: ICON_ALERTS });
  }
  return actions;
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [
    { pendingLogin, inTesting, awaitingReview, attentionItems, queueSamples, approvedLast7, rejectedLast7, passRate },
    unread,
  ] = await Promise.all([getDashboardData(), getUnreadCount(user.id)]);

  const totalActive = pendingLogin + inTesting + awaitingReview;
  const pct = (n: number) => (totalActive > 0 ? `${(n / totalActive) * 100}%` : "0%");

  return (
    <div className="min-h-screen flex flex-col bg-page-bg">
      <TopNav active="home" unreadCount={unread} role={user.accessRole} userName={user.name} />
      <MobileTopBar unreadCount={unread} userName={user.name} />

      <div className="flex-1 p-5 flex flex-col gap-5">
        <div
          className="rounded-[20px] p-[18px]"
          style={{
            background: "linear-gradient(152deg, #FFFFFF 0%, #F1F9FC 100%)",
            border: "1px solid #E4EFF4",
            boxShadow: "0 1px 2px rgba(16,42,58,0.04), 0 10px 26px rgba(43,141,184,0.10)",
          }}
        >
          <div className="flex items-baseline justify-between mb-3">
            <span className="text-[13px] font-semibold text-text">Today&apos;s workload</span>
            <span className="text-xs text-muted">{totalActive} active</span>
          </div>
          <div className="flex h-2.5 rounded-full overflow-hidden bg-[#EEF2F5] mb-3.5">
            <div style={{ width: pct(pendingLogin), background: "#93A6B0" }} />
            <div style={{ width: pct(inTesting), background: "#2B8DB8" }} />
            <div style={{ width: pct(awaitingReview), background: "#F5A623" }} />
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            <Link href="/samples?status=Pending+Login" className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#93A6B0" }} />
                <span className="text-[23px] font-bold text-text tracking-tight tabular-nums font-mono-data leading-none">
                  {pendingLogin}
                </span>
              </div>
              <span className="text-xs text-muted leading-tight">Pending login</span>
            </Link>
            <Link href="/samples?status=In+Testing" className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#2B8DB8" }} />
                <span className="text-[23px] font-bold text-text tracking-tight tabular-nums font-mono-data leading-none">
                  {inTesting}
                </span>
              </div>
              <span className="text-xs text-muted leading-tight">In testing</span>
            </Link>
            <Link href="/samples" className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: "#F5A623" }} />
                <span className="text-[23px] font-bold text-text tracking-tight tabular-nums font-mono-data leading-none">
                  {awaitingReview}
                </span>
              </div>
              <span className="text-xs text-muted leading-tight">Awaiting QA</span>
            </Link>
          </div>
        </div>

        {passRate !== null && (
          <Card className="flex items-center gap-3.5">
            <div className="text-[22px] font-bold text-success-dark shrink-0 tabular-nums font-mono-data">
              {passRate}%
            </div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-text">Pass rate, last 7 days</div>
              <div className="text-[11px] text-muted mt-0.5">
                {approvedLast7} approved · {rejectedLast7} rejected
              </div>
            </div>
          </Card>
        )}

        {attentionItems.length > 0 && (
          <div>
            <div className="text-[13px] font-semibold text-text mb-2.5">Needs attention</div>
            <div className="flex flex-col gap-2.5">
              {attentionItems.map((a, i) => {
                const rejected = a.tag === "REJECTED";
                const iconBg = rejected ? "#FDECEA" : "#FEF3E0";
                const iconColor = rejected ? "#D0021B" : "#F5A623";
                return (
                  <Link
                    key={`${a.tag}-${a.id}`}
                    href={`/samples/${a.id}`}
                    className="stagger-item flex gap-3 items-center bg-white border border-border rounded-[18px] shadow-card p-3.5"
                    style={{ "--stagger": i } as React.CSSProperties}
                  >
                    <div
                      className="w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0"
                      style={{ background: iconBg }}
                    >
                      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={iconColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        {rejected ? (
                          <>
                            <path d="M12 4.5L21 20H3z" />
                            <path d="M12 10.5v4" />
                            <path d="M12 17.4h.01" />
                          </>
                        ) : (
                          <>
                            <circle cx="12" cy="12" r="9" />
                            <path d="M12 7v5l3 2" />
                          </>
                        )}
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold tracking-wide uppercase" style={{ color: iconColor }}>
                        {a.tag}
                      </div>
                      <div className="text-sm font-semibold text-text leading-snug mt-0.5 truncate">{a.title}</div>
                      <div className="text-xs text-muted mt-0.5 leading-snug truncate">{a.body}</div>
                    </div>
                    <svg width="7" height="12" viewBox="0 0 8 14" className="shrink-0">
                      <path d="M1 1l6 6-6 6" stroke="#C2D2DB" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-baseline justify-between mb-2.5">
            <span className="text-[13px] font-semibold text-text">My queue</span>
            <Link href="/samples" className="text-[13px] font-semibold text-primary">
              See all
            </Link>
          </div>
          <div className="bg-white border border-border rounded-[18px] shadow-card overflow-hidden">
            {queueSamples.map((s, i) => (
              <Link
                key={s.id}
                href={`/samples/${s.id}`}
                className={`stagger-item flex items-center gap-3 px-3.5 py-3.5 ${i < queueSamples.length - 1 ? "border-b border-border-soft" : ""}`}
                style={{ "--stagger": i } as React.CSSProperties}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.dotColor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-semibold text-text font-mono-data tracking-tight">{s.id}</span>
                    <span className="text-[13px] font-medium text-text truncate">{s.type}</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5 truncate">{s.source}</div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] font-semibold" style={{ color: s.dueColor }}>
                    {s.dueLabel}
                  </span>
                  <span className="text-[11px] text-faint">{s.statusShort}</span>
                </div>
              </Link>
            ))}
            {queueSamples.length === 0 && (
              <div className="px-3.5 py-6 text-center text-xs text-muted">No open samples right now.</div>
            )}
          </div>
        </div>

        <div>
          <div className="text-[13px] font-semibold text-text mb-2.5">Quick actions</div>
          <div className="grid grid-cols-2 gap-2.5">
            {quickActionsFor(user.accessRole).map((a) => (
              <Link
                key={a.href + a.label}
                href={a.href}
                className="bg-white border border-border rounded-2xl shadow-card-sm px-3.5 py-3.5 flex items-center gap-2.5 min-h-[56px]"
              >
                <div className="w-[34px] h-[34px] rounded-[9px] bg-primary-soft flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                    {a.icon}
                  </svg>
                </div>
                <span className="text-[13px] font-semibold text-text leading-tight">{a.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="home" unreadCount={unread} />
    </div>
  );
}
