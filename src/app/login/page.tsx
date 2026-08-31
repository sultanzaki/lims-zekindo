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
    <div className="min-h-screen">
      {/* Mobile: centered card (unchanged) */}
      <div className="md:hidden min-h-screen flex flex-col bg-page-bg px-6">
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

      {/* Desktop: split-screen — brand panel + sign-in form */}
      <div className="hidden md:grid md:grid-cols-[44%_56%] md:min-h-screen">
        <div className="relative bg-primary-dark px-16 flex flex-col justify-center overflow-hidden">
          <div className="absolute -top-24 -right-28 w-[340px] h-[340px] rounded-full border border-white/10" />
          <div className="absolute -top-10 -right-16 w-[220px] h-[220px] rounded-full border border-white/[0.14]" />
          <div className="absolute -bottom-32 -left-24 w-[280px] h-[280px] rounded-full bg-white/[0.04]" />
          <svg
            className="absolute bottom-16 right-14 opacity-[0.14]"
            width="150"
            height="150"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="1.1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 3h6M9.5 3v5.7a3 3 0 01-.6 1.8L4.9 16.8a3.3 3.3 0 002.6 5.2h9a3.3 3.3 0 002.6-5.2L14.6 10.5a3 3 0 01-.6-1.8V3" />
            <path d="M6.8 17h10.4" />
          </svg>

          <div className="relative flex flex-col gap-7 max-w-[420px]">
            <div className="inline-flex items-center bg-white rounded-2xl px-5 py-3.5 self-start">
              <Image
                src="/zekindo-logo.png"
                alt="Zekindo Chemicals"
                width={110}
                height={28}
                style={{ height: 28, width: "auto" }}
                priority
              />
            </div>

            <div className="text-[32px] font-bold text-white leading-[1.25] tracking-tight">
              Laboratory Information
              <br />
              Management System
            </div>

            <div className="flex flex-col gap-3.5 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[9px] bg-white/10 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 3h6M10 3v5.2a3 3 0 01-.6 1.8L5.7 15.4A3 3 0 008 20.5h8a3 3 0 002.3-5.1L14.6 10a3 3 0 01-.6-1.8V3" />
                    <path d="M6.5 15.5h11" />
                  </svg>
                </div>
                <span className="text-[13.5px] text-white/80">Chain of custody from collection to certificate</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-[9px] bg-white/10 flex items-center justify-center shrink-0">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="17" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <path d="M12 14.5v3l2 1.2" />
                  </svg>
                </div>
                <span className="text-[13.5px] text-white/80">TAT tracking and calibration alerts</span>
              </div>
            </div>

            <div className="text-[11px] text-white/50 tracking-wide mt-4">Powered by Product Specialist Microbiology</div>
          </div>
        </div>

        <div className="flex items-center justify-center px-16">
          <form action={formAction} className="w-full max-w-[380px] flex flex-col gap-6">
            <div>
              <div className="text-[22px] font-bold text-text tracking-tight mb-1.5">Sign in</div>
              <div className="text-[13.5px] text-muted">Use your lab credentials to continue</div>
            </div>

            <div className="flex flex-col gap-4">
              <Field label="Email or Employee ID" htmlFor="identifier-desktop">
                <input
                  id="identifier-desktop"
                  name="identifier"
                  type="text"
                  placeholder="a.wijaya@lab.local"
                  autoComplete="username"
                  className={inputClass}
                />
              </Field>

              <Field label="Password" htmlFor="password-desktop">
                <input
                  id="password-desktop"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className={inputClass}
                />
              </Field>
            </div>

            {state.error && <div className="text-xs font-medium text-danger -mt-2">{state.error}</div>}

            <Button type="submit" disabled={pending}>
              {pending ? "Signing in…" : "Sign In"}
            </Button>
            <div className="text-center text-xs text-muted">
              Forgot your password? Ask your Lab Manager to reset it.
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
