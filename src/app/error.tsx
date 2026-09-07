"use client";

// Global error boundary — catches unhandled errors that bubble past segment
// boundaries. Keeps a calm, non-technical message (raw error goes to console
// only) and offers real recovery actions. For errors inside a route segment,
// Next.js prefers the nearest segment error.tsx; this one catches the rest.
import ErrorScreen from "@/components/ErrorScreen";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorScreen
      error={error}
      reset={reset}
      backHref="/dashboard"
      backLabel="Go to dashboard"
    />
  );
}
