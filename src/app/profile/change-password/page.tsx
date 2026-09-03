import { requirePageUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import ChangePasswordForm from "@/components/ChangePasswordForm";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Change Password" };

export default async function ChangePasswordPage() {
  const user = await requirePageUser();
  const unread = await getUnreadCount(user.id);

  return (
    <div className="min-h-screen flex flex-col bg-white md:pl-[var(--sidebar-w)] transition-[padding-left] duration-200">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Change Password" backHref="/profile" />
      <div className="flex-1 px-5 md:px-8 pt-4.5 pb-7 md:max-w-[480px] md:w-full">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
