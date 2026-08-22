import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getDashboardData, getUnreadCount } from "@/lib/data";
import StatusBadge from "@/components/StatusBadge";
import BottomNav from "@/components/BottomNav";

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function alertAccent(title: string) {
  if (title.toLowerCase().includes("rejected")) return "#D0021B";
  if (title.toLowerCase().includes("approved")) return "#28A745";
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
    <div className="min-h-screen flex flex-col bg-surface">
      <div className="px-5 pt-6 pb-3.5 flex items-center justify-between bg-white border-b border-border">
        <div>
          <div className="text-xs text-muted">{greeting()}</div>
          <div className="text-lg font-bold text-text">{user.name}</div>
        </div>
        <Link
          href="/notifications"
          className="relative w-10 h-10 rounded-full bg-surface-alt flex items-center justify-center shrink-0"
        >
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {unread > 0 && (
            <div className="absolute top-1.5 right-2 w-2 h-2 rounded-full bg-danger border-[1.5px] border-surface-alt" />
          )}
        </Link>
      </div>

      <div className="flex-1 p-5 flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white border border-border rounded-xl px-2 py-3.5 text-center">
            <div className="text-[22px] font-bold" style={{ color: "#6B8A96" }}>
              {pendingLogin}
            </div>
            <div className="text-[10px] text-muted mt-0.5 leading-tight">
              Pending
              <br />
              Login
            </div>
          </div>
          <div className="bg-white border border-border rounded-xl px-2 py-3.5 text-center">
            <div className="text-[22px] font-bold text-primary">{inTesting}</div>
            <div className="text-[10px] text-muted mt-0.5 leading-tight">
              In
              <br />
              Testing
            </div>
          </div>
          <div className="bg-white border border-border rounded-xl px-2 py-3.5 text-center">
            <div className="text-[22px] font-bold" style={{ color: "#a36a00" }}>
              {awaitingReview}
            </div>
            <div className="text-[10px] text-muted mt-0.5 leading-tight">
              Awaiting
              <br />
              Review
            </div>
          </div>
        </div>

        {overdueCount > 0 && (
          <Link
            href="/samples"
            className="flex items-center gap-2.5 bg-danger-bg border border-danger rounded-[10px] p-3"
          >
            <div className="w-2 h-2 rounded-full bg-danger shrink-0" />
            <div className="flex-1 text-[13px] font-semibold text-danger">
              {overdueCount} sample{overdueCount > 1 ? "s" : ""} past target turnaround time
            </div>
          </Link>
        )}

        {passRate !== null && (
          <div className="bg-white border border-border rounded-xl p-3.5 flex items-center gap-3.5">
            <div className="text-[22px] font-bold text-success-dark shrink-0">{passRate}%</div>
            <div className="flex-1">
              <div className="text-xs font-semibold text-text">Pass rate, last 7 days</div>
              <div className="text-[11px] text-muted mt-0.5">
                {approvedLast7} approved · {rejectedLast7} rejected
              </div>
            </div>
          </div>
        )}

        <div>
          <div className="text-[13px] font-semibold text-text mb-2.5">Quick Actions</div>
          <div className="grid grid-cols-3 gap-2.5">
            <Link href="/samples/new" className="bg-white border border-border rounded-xl px-1.5 py-3.5 flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-surface-alt flex items-center justify-center">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="2" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-[#444]">New Sample</span>
            </Link>
            <Link href="/scan" className="bg-white border border-border rounded-xl px-1.5 py-3.5 flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-surface-alt flex items-center justify-center">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round">
                  <path d="M4 8V5a1 1 0 011-1h3" />
                  <path d="M20 8V5a1 1 0 00-1-1h-3" />
                  <path d="M4 16v3a1 1 0 001 1h3" />
                  <path d="M20 16v3a1 1 0 01-1 1h-3" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-[#444]">Scan</span>
            </Link>
            <Link href="/samples" className="bg-white border border-border rounded-xl px-1.5 py-3.5 flex flex-col items-center gap-2">
              <div className="w-9 h-9 rounded-full bg-surface-alt flex items-center justify-center">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#2B8DB8" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="8" y="2" width="8" height="4" rx="1" />
                  <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
                </svg>
              </div>
              <span className="text-[11px] font-semibold text-[#444]">My Tasks</span>
            </Link>
          </div>
        </div>

        {alerts.length > 0 && (
          <div>
            <div className="text-[13px] font-semibold text-text mb-2.5">Alerts</div>
            <div className="flex flex-col gap-2">
              {alerts.map((n) => (
                <Link
                  key={n.id}
                  href={n.sampleId ? `/samples/${n.sampleId}` : "/notifications"}
                  className="flex gap-2.5 items-start bg-white border border-border rounded-[10px] p-3"
                >
                  <div
                    className="w-2 h-2 rounded-full mt-1.5 shrink-0"
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
            <div className="text-[13px] font-semibold text-text">Recent Samples</div>
            <Link href="/samples" className="text-xs font-semibold text-primary">
              See all
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentSamples.map((s) => (
              <Link
                key={s.id}
                href={`/samples/${s.id}`}
                className="flex items-center gap-2.5 bg-white border border-border rounded-[10px] p-3"
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
