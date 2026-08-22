"use client";

import { useActionState } from "react";
import { changePasswordAction, type ChangePasswordState } from "@/lib/actions/auth";

const initialState: ChangePasswordState = {};

export default function ChangePasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialState);

  if (state.success) {
    return (
      <div className="text-sm font-medium text-success-dark bg-success-bg border border-success rounded-xl p-4">
        Password updated. Use your new password next time you sign in.
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <Field label="Current Password" name="currentPassword" />
      <Field label="New Password" name="newPassword" />
      <Field label="Confirm New Password" name="confirmPassword" />
      {state.error && <div className="text-xs font-medium text-danger">{state.error}</div>}
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-white rounded-full py-3.5 text-[15px] font-semibold cursor-pointer disabled:opacity-60"
      >
        {pending ? "Updating…" : "Update Password"}
      </button>
    </form>
  );
}

function Field({ label, name }: { label: string; name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-semibold text-text" htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type="password"
        required
        autoComplete={name === "currentPassword" ? "current-password" : "new-password"}
        className="text-sm px-3.5 py-3 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
      />
    </div>
  );
}
