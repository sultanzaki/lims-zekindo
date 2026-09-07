"use client";

import ErrorScreen from "@/components/ErrorScreen";

export default function InventoryError({
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
      title="Couldn't load inventory"
      message="The inventory data couldn't be loaded. Your data is safe — please try again."
      backHref="/dashboard"
      backLabel="Go to dashboard"
    />
  );
}
