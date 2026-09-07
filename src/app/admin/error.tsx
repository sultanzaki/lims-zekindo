"use client";

import ErrorScreen from "@/components/ErrorScreen";

export default function AdminError({
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
      title="Couldn't load admin page"
      message="This admin page couldn't be loaded. Your data is safe — please try again."
      backHref="/dashboard"
      backLabel="Go to dashboard"
    />
  );
}
