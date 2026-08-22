"use client";

export default function PrintButton({ label = "Share / Export PDF" }: { label?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className="mt-2 w-full bg-primary text-white rounded-full py-3.5 text-[15px] font-semibold cursor-pointer"
    >
      {label}
    </button>
  );
}
