import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData, getUnreadCount } from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import MobileTopBar from "@/components/MobileTopBar";
import Card from "@/components/ui/Card";
import SectionLabel from "@/components/ui/SectionLabel";

function alertAccent(title: string) {
  if (title.toLowerCase().includes("rejected")) return "#C22233";
  if (title.toLowerCase().includes("approved")) return "#1A8A4A";
  return "#2B8DB8";
}

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const [
    { pendingLogin, inTesting, awaitingReview, overdueCount, alerts, recentSamples, approvedLast7, rejectedLast7, passRate },
    unread,
  ] = await Promise.all([getDashboardData(user.id), getUnreadCount(user.id)]);

  return (
    <div className="h-dvh flex flex-col overflow-y-auto overscroll-contain bg-page-bg">
      <TopNav active="home" hasUnread={unread > 0} role={user.accessRole} userName={user.name} />
      <MobileTopBar hasUnread={unread > 0} />

      <div className="flex-1 p-5 flex flex-col gap-5">
        <Card padded={false} className="grid grid-cols-3 divide-x divide-border">
          <StatCell value={pendingLogin} label="Pending Login" color="#6B7A87" />
          <StatCell value={inTesting} label="In Testing" color="#2B8DB8" />
          <StatCell value={awaitingReview} label="Awaiting Review" color="#B3720C" />
        </Card>

        {overdueCount > 0 && (
          <Link
            href="/samples"
            className="flex items-center gap-2.5 bg-danger-bg border border-danger/30 rounded-xl px-3.5 py-3"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-danger shrink-0" />
            <div className="flex-1 text-[13px] font-semibold text-danger">
              {overdueCount} sample{overdueCount > 1 ? "s" : ""} past target turnaround time
            </div>
          </Link>
        )}

        {passRate !== null && (
          <Card className="flex items-center gap-3.5">
            <div className="text-[22px] font-bold text-success-dark shrink-0 tabular-nums">{passRate}%</div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-text">Pass rate, last 7 days</div>
              <div className="text-[11px] text-muted mt-0.5">
                {approvedLast7} approved · {rejectedLast7} rejected
              </div>
            </div>
          </Card>
        )}

        <div>
          <SectionLabel className="mb-2.5">Quick Actions</SectionLabel>
          <div className="grid grid-cols-3 gap-2.5">
            <QuickAction href="/samples/new" label="New Sample">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </QuickAction>
            <QuickAction href="/scan" label="Scan">
              <path d="M4 8V5a1 1 0 011-1h3" />
              <path d="M20 8V5a1 1 0 00-1-1h-3" />
              <path d="M4 16v3a1 1 0 001 1h3" />
              <path d="M20 16v3a1 1 0 01-1 1h-3" />
            </QuickAction>
            <QuickAction href="/samples" label="My Tasks">
              <rect x="8" y="2" width="8" height="4" rx="1" />
              <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
            </QuickAction>
          </div>
        </div>

        {alerts.length > 0 && (
          <div>
            <SectionLabel className="mb-2.5">Alerts</SectionLabel>
            <div className="flex flex-col gap-2">
              {alerts.map((n) => (
                <Link
                  key={n.id}
                  href={n.sampleId ? `/samples/${n.sampleId}` : "/notifications"}
                  className="flex gap-2.5 items-start bg-white border border-border rounded-xl p-3"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: alertAccent(n.title) }}
                  />
                  <div className="flex-1">
                    <div className="text-[13px] font-semibold text-text">{n.title}</div>
                    <div className="text-xs text-muted mt-0.5 leading-snug">{n.body}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        <div>
          <div className="flex items-baseline justify-between mb-2.5">
            <SectionLabel>Recent Samples</SectionLabel>
            <Link href="/samples" className="text-xs font-semibold text-primary">
              See all
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentSamples.map((s) => (
              <Link
                key={s.id}
                href={`/samples/${s.id}`}
                className="flex items-center gap-2.5 bg-white border border-border rounded-xl p-3"
              >
                <div className="flex-1">
                  <div className="text-[13px] font-semibold text-text">{s.id}</div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {s.type} · {s.source}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <BottomNav active="home" hasUnread={unread > 0} />
    </div>
  );
}

function StatCell({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="px-2 py-3.5 text-center">
      <div className="text-[20px] font-bold tabular-nums" style={{ color }}>
        {value}
      </div>
      <div className="text-[10px] text-muted mt-0.5 leading-tight">{label}</div>
    </div>
  );
}

function QuickAction({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="bg-white border border-border rounded-xl px-1.5 py-4 flex flex-col items-center gap-2"
    >
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </svg>
      <span className="text-[11px] font-semibold text-text">{label}</span>
    </Link>
  );
}
