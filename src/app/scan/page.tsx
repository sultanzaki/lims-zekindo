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
    <div className="min-h-screen flex flex-col bg-page-bg">
      <TopNav active="scan" unreadCount={unread} role={user.accessRole} userName={user.name} />
      <div className="px-5 pt-6 pb-4 bg-white border-b border-border">
        <div className="text-[19px] font-bold text-text tracking-tight">Scan Barcode</div>
        <div className="text-xs text-muted mt-0.5">Samples, equipment, reagents, and warehouse locations</div>
      </div>
      <ScannerClient />
      <BottomNav active="scan" unreadCount={unread} />
    </div>
  );
}
