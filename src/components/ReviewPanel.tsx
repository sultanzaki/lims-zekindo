"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/samples";

const initialState: FormState = {};

export default function ReviewPanel({
  title,
  body,
  canAct,
  approveAction,
  rejectAction,
  approveLabel,
}: {
  title: string;
  body: string;
  canAct: boolean;
  approveAction: (prevState: FormState, formData: FormData) => Promise<FormState>;
  rejectAction: (prevState: FormState, formData: FormData) => Promise<FormState>;
  approveLabel: string;
}) {
  const [password, setPassword] = useState("");
  const [approveState, approveFormAction, approvePending] = useActionState(approveAction, initialState);
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rejectAction, initialState);

  return (
    <div className="flex flex-col gap-2.5 bg-warning-bg border border-[#F5A623] rounded-xl p-4">
      <div className="text-[13px] font-semibold text-[#a36a00]">{title}</div>
      <div className="text-xs text-[#a36a00]">{body}</div>
      {canAct ? (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-[#a36a00]" htmlFor="review-password">
              Enter your password to sign this decision
            </label>
            <input
              type="password"
              id="review-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-xs px-3 py-2 border-[1.5px] border-[#F5A623] rounded-lg text-text bg-white"
            />
          </div>
          {(approveState.error || rejectState.error) && (
            <div className="text-xs text-danger">{approveState.error || rejectState.error}</div>
          )}
          <div className="flex gap-2.5">
            <form action={rejectFormAction} className="flex-1">
              <input type="hidden" name="password" value={password} />
              <button
                type="submit"
                disabled={rejectPending || approvePending}
                className="w-full bg-white text-danger border border-danger rounded-full py-3 text-[13px] font-semibold cursor-pointer disabled:opacity-60"
              >
                {rejectPending ? "Signing…" : "Reject"}
              </button>
            </form>
            <form action={approveFormAction} className="flex-1">
              <input type="hidden" name="password" value={password} />
              <button
                type="submit"
                disabled={approvePending || rejectPending}
                className="w-full bg-success text-white rounded-full py-3 text-[13px] font-semibold cursor-pointer disabled:opacity-60"
              >
                {approvePending ? "Signing…" : approveLabel}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="text-xs text-[#a36a00] italic">Waiting on a reviewer with permission to act.</div>
      )}
    </div>
  );
}
