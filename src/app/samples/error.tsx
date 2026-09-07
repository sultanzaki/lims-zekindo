"use client";

import ErrorScreen from "@/components/ErrorScreen";

export default function SamplesError({
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
      title="Couldn't load samples"
      message="The sample list couldn't be loaded. Your data is safe — please try again."
      backHref="/dashboard"
      backLabel="Go to dashboard"
    />
  );
}
