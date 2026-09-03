import { requirePageUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import BottomNav from "@/components/BottomNav";
import Sidebar from "@/components/Sidebar";
import ScanModeSwitch from "@/components/ScanModeSwitch";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Scan" };

export default async function ScanPage() {
  const user = await requirePageUser();
  const unread = await getUnreadCount(user.id);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <div className="px-5 pt-6 md:pt-10 pb-4 bg-white border-b border-border">
        <div className="text-[19px] font-bold text-text tracking-tight">Scan Barcode</div>
        <div className="text-xs text-muted mt-0.5">Samples, equipment, reagents, and warehouse locations</div>
      </div>
      <ScanModeSwitch />
      <BottomNav active="scan" unreadCount={unread} />
    </div>
  );
}
