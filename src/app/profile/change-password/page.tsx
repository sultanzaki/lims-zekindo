import BackHeader from "@/components/BackHeader";
import ChangePasswordForm from "@/components/ChangePasswordForm";

export default function ChangePasswordPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BackHeader title="Change Password" backHref="/profile" />
      <div className="flex-1 px-5 pt-4.5 pb-7">
        <ChangePasswordForm />
      </div>
    </div>
  );
}
