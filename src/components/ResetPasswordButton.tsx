"use client";

import { useActionState } from "react";
import { resetPasswordAction, type FormState } from "@/lib/actions/admin-users";

const initialState: FormState = {};

export default function ResetPasswordButton({ userId }: { userId: string }) {
  const [state, formAction, pending] = useActionState(
    () => resetPasswordAction(userId),
    initialState
  );

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button
        type="submit"
        disabled={pending}
        className="text-[11px] font-semibold text-primary cursor-pointer disabled:opacity-60"
      >
        {pending ? "Resetting…" : "Reset password"}
      </button>
      {state.tempPassword && (
        <div className="text-[10px] text-success-dark">New temp password: <strong>{state.tempPassword}</strong></div>
      )}
    </form>
  );
}
