"use client";

import { useActionState } from "react";
import Image from "next/image";
import { loginAction, type LoginState } from "@/lib/actions/auth";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <div
      className="min-h-screen flex flex-col px-6"
      style={{ background: "linear-gradient(160deg,#E8F4FA 0%,#ffffff 55%)" }}
    >
      <div className="flex-1 flex flex-col justify-center gap-6 py-10 max-w-sm mx-auto w-full">
        <div className="flex flex-col items-center gap-2.5">
          <Image
            src="/zekindo-logo.png"
            alt="Zekindo Chemicals"
            width={160}
            height={32}
            style={{ height: 32, width: "auto" }}
            priority
          />
          <div className="text-[11px] font-semibold text-primary tracking-wider uppercase text-center">
            Laboratory Information Management System
          </div>
        </div>

        <form
          action={formAction}
          className="flex flex-col gap-4 bg-white rounded-2xl p-6 shadow-[0_4px_16px_rgba(0,0,0,0.08)] border border-border"
        >
          <div>
            <div className="text-xl font-bold text-text mb-1">Sign in</div>
            <div className="text-[13px] text-muted">Use your lab credentials to continue</div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text" htmlFor="identifier">
              Email or Employee ID
            </label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              placeholder="a.wijaya@lab.local"
              autoComplete="username"
              className="text-sm px-3.5 py-3 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              autoComplete="current-password"
              className="text-sm px-3.5 py-3 border-[1.5px] border-border-soft rounded-lg text-text bg-white"
            />
          </div>

          {state.error && (
            <div className="text-xs font-medium text-danger -mt-1">{state.error}</div>
          )}

          <button
            type="submit"
            disabled={pending}
            className="bg-primary text-white rounded-full py-3.5 text-[15px] font-semibold cursor-pointer disabled:opacity-60"
          >
            {pending ? "Signing in…" : "Sign In"}
          </button>
          <div className="text-center text-xs text-primary font-semibold cursor-pointer">
            Forgot password?
          </div>
        </form>

        <div className="text-center text-[11px] text-muted">
          General Testing Laboratory · Microbiology Section
        </div>
        <div className="text-center text-[11px] text-faint">
          Demo login: a.wijaya@lab.local / lab1234
        </div>
      </div>
    </div>
  );
}
