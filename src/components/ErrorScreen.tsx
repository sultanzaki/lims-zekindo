"use client";

import { useEffect } from "react";

// Reusable error screen for route segments (error.tsx boundaries) and the
// global error boundary. Keeps wording calm and non-technical; the raw error
// only goes to the console. `backHref` renders a secondary link when the
// segment has a sensible home (e.g. /samples for a sample detail page).
export default function ErrorScreen({
  error,
  reset,
  title = "Something went wrong",
  message = "An unexpected error interrupted this page. Your data is safe — please try again.",
  backHref,
  backLabel = "Go back",
}: {
  error?: Error & { digest?: string };
  reset?: () => void;
  title?: string;
  message?: string;
  backHref?: string;
  backLabel?: string;
}) {
  useEffect(() => {
    if (error) console.error("Unhandled page error", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-page-bg px-6">
      <div className="w-full max-w-[420px] flex flex-col items-center text-center">
        <div className="w-[72px] h-[72px] rounded-full bg-danger-bg flex items-center justify-center mb-5">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#B00016" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
          </svg>
        </div>
        <h1 className="text-[19px] font-bold text-text tracking-tight">{title}</h1>
        <p className="text-[13px] text-muted mt-1.5 leading-relaxed">{message}</p>
        <div className="flex gap-2.5 mt-6">
          {reset && (
            <button
              type="button"
              onClick={reset}
              className="text-[13px] font-semibold px-5 py-2.5 rounded-full bg-primary text-white hover:bg-primary-dark cursor-pointer"
            >
              Try again
            </button>
          )}
          {backHref && (
            <a
              href={backHref}
              className="text-[13px] font-semibold px-5 py-2.5 rounded-full border border-border bg-white text-text hover:bg-surface-alt cursor-pointer"
            >
              {backLabel}
            </a>
          )}
        </div>
        {process.env.NODE_ENV === "development" && error?.digest && (
          <div className="mt-6 text-[11px] text-faint font-mono-data">Error digest: {error.digest}</div>
        )}
      </div>
    </div>
  );
}
