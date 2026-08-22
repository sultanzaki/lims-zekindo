import { getSessionUserId } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import BottomNav from "@/components/BottomNav";
import ScannerClient from "@/components/ScannerClient";

export default async function ScanPage() {
  const userId = await getSessionUserId();
  if (!userId) return null;
  const unread = await getUnreadCount(userId);

  return (
    <div className="min-h-screen flex flex-col bg-scanner-bg">
      <div className="px-5 pt-6 pb-4 bg-white border-b border-border">
        <div className="text-[17px] font-bold text-text">Scan Sample</div>
      </div>
      <ScannerClient />
      <BottomNav active="scan" hasUnread={unread > 0} />
    </div>
  );
}
