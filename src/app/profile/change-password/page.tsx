import { requirePageUser } from "@/lib/auth";
import { getUnreadCount } from "@/lib/data";
import BackHeader from "@/components/BackHeader";
import Sidebar from "@/components/Sidebar";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default async function ChangePasswordPage() {
  const user = await requirePageUser();
  const unread = await getUnreadCount(user.id);

  return (
    <div className="min-h-screen flex flex-col bg-white md:pl-64">
      <Sidebar role={user.accessRole} userName={user.name} unreadCount={unread} />
      <BackHeader title="Change Password" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
