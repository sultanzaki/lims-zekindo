"use client";

import Button from "@/components/ui/Button";

export default function PrintButton({ label = "Share / Export PDF" }: { label?: string }) {
  return (
    <Button onClick={() => window.print()} className="mt-2">
      {label}
    </Button>
  );
}
