import { getCurrentUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import BottomNav from "@/components/BottomNav";
import TopNav from "@/components/TopNav";
import ScannerClient from "@/components/ScannerClient";

export default async function ScanPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const unread = await getUnreadCount(user.id);

  return (
    <div className="min-h-screen flex flex-col bg-scanner-bg">
      <TopNav active="scan" hasUnread={unread > 0} role={user.accessRole} userName={user.name} />
      <div className="px-5 pt-6 pb-4 bg-white border-b border-border">
        <div className="text-[19px] font-bold text-text tracking-tight">Scan Sample</div>
      </div>
      <ScannerClient />
      <BottomNav active="scan" hasUnread={unread > 0} />
    </div>
  );
}
