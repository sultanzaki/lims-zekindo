"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/lib/actions/samples";
import Button from "@/components/ui/Button";
import { inputClassSm } from "@/components/ui/Field";

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
    <div className="flex flex-col gap-3 bg-warning-bg border border-warning/30 rounded-xl p-4">
      <div>
        <div className="text-[13px] font-semibold text-warning-dark">{title}</div>
        <div className="text-xs text-warning-dark mt-0.5">{body}</div>
      </div>
      {canAct ? (
        <>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-warning-dark" htmlFor="review-password">
              Enter your password to sign this decision
            </label>
            <input
              type="password"
              id="review-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputClassSm} border-warning/40`}
            />
          </div>
          {(approveState.error || rejectState.error) && (
            <div className="text-xs text-danger">{approveState.error || rejectState.error}</div>
          )}
          <div className="flex gap-2.5">
            <form action={rejectFormAction} className="flex-1">
              <input type="hidden" name="password" value={password} />
              <Button variant="outlineDanger" size="sm" disabled={rejectPending || approvePending}>
                {rejectPending ? "Signing…" : "Reject"}
              </Button>
            </form>
            <form action={approveFormAction} className="flex-1">
              <input type="hidden" name="password" value={password} />
              <Button variant="success" size="sm" disabled={approvePending || rejectPending}>
                {approvePending ? "Signing…" : approveLabel}
              </Button>
            </form>
          </div>
        </>
      ) : (
        <div className="text-xs text-warning-dark italic">Waiting on a reviewer with permission to act.</div>
      )}
    </div>
  );
}
