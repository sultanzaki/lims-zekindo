"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/lib/actions/auth";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: ChangePasswordState = {};

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  if (state.success) {
    return (
      <div className="text-sm font-medium text-success-dark bg-success-bg border border-success/30 rounded-[18px] p-4">
        Password updated. Use your new password next time you sign in.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <PasswordField label="Current Password" name="currentPassword" />
      <PasswordField label="New Password" name="newPassword" />
      <PasswordField label="Confirm New Password" name="confirmPassword" />
      {state.error && <div className="text-xs font-medium text-danger">{state.error}</div>}
      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update Password"}
      </Button>
    </form>
  );
}

function PasswordField({ label, name }: { label: string; name: string }) {
  return (
    <Field label={label} htmlFor={name}>
      <input
        id={name}
        name={name}
        type="password"
        required
        autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
        className={inputClass}
      />
    </Field>
  );
}
