"use client";

import { useActionState } from "react";
import Image from "next/image";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import Field, { inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div className="min-h-screen flex flex-col bg-page-bg px-6">
      <div className="flex-1 flex flex-col justify-center gap-7 py-10 max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center gap-3">
          <Image
            src="/zekindo-logo.png"
            alt="Zekindo Chemicals"
            width={90}
            height={30}
            style={{ height: 30, width: "auto" }}
            priority
          />
          <div className="text-[10.5px] font-semibold text-muted tracking-[0.14em] uppercase text-center">
            Laboratory Information Management System
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-4 bg-white rounded-[18px] shadow-card p-6 border border-border">
          <div>
            <div className="text-[19px] font-bold text-text mb-1 tracking-tight">Sign in</div>
            <div className="text-[13px] text-muted">Use your lab credentials to continue</div>
          </div>

          <Field label="Email or Employee ID" htmlFor="identifier">
            <input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="a.wijaya@lab.local"
              autoComplete="username"
              className={inputClass}
            />
          </Field>

          <Field label="Password" htmlFor="password">
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className={inputClass}
            />
          </Field>

          {state.error && <div className="text-xs font-medium text-danger -mt-1">{state.error}</div>}

          <Button type="submit" disabled={pending} className="mt-1">
            {pending ? "Signing in…" : "Sign In"}
          </Button>
          <div className="text-center text-xs text-muted">
            Forgot your password? Ask your Lab Manager to reset it.
          </div>
        </form>

        <div className="text-center text-[10px] text-faint tracking-wide">
          Powered by Product Specialist Microbiology
        </div>
      </div>
    </div>
  );
}
