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
    <div className="min-h-screen flex flex-col bg-white px-4">
      <div className="flex-1 flex flex-col justify-center gap-6 py-10 max-w-sm mx-auto w-full">
        <div
          className="rounded-[22px] px-[22px] pt-6 pb-[26px] flex flex-col gap-4"
          style={{
            background: "linear-gradient(158deg, #1A5F7A 0%, #2B8DB8 100%)",
            boxShadow: "0 10px 26px rgba(26,95,122,0.22)",
          }}
        >
          <Image
            src="/zekindo-logo-white.png"
            alt="Zekindo Chemicals"
            width={78}
            height={26}
            style={{ height: 26, width: "auto" }}
            priority
          />
          <div className="text-[25px] font-bold text-white leading-[1.18] tracking-tight">
            Laboratory Information Management
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-[18px]">
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

        <div className="text-center text-[11px] text-faint">LIMS Mobile · v1.4.2</div>
      </div>
    </div>
  );
}
