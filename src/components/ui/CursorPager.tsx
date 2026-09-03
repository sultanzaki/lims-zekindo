"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { CursorPageInfo } from "@/lib/pagination";

export default function CursorPager({ hasNext, hasPrev, nextCursor, prevCursor }: CursorPageInfo) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function hrefFor(param: "after" | "before", cursor: string | null) {
    if (!cursor) return undefined;
    const sp = new URLSearchParams(searchParams.toString());
    sp.delete("after");
    sp.delete("before");
    sp.set(param, cursor);
    return `${pathname}?${sp.toString()}`;
  }

  if (!hasNext && !hasPrev) return null;

  const prevHref = hasPrev ? hrefFor("before", prevCursor) : undefined;
  const nextHref = hasNext ? hrefFor("after", nextCursor) : undefined;

  return (
    <div className="flex items-center justify-center gap-3 py-4">
      {prevHref ? (
        <Link href={prevHref} className="text-xs font-semibold px-3.5 py-2 rounded-full border border-border bg-white text-text cursor-pointer">
          ← Previous
        </Link>
      ) : (
        <span className="text-xs font-semibold px-3.5 py-2 rounded-full border border-border-soft text-faint">← Previous</span>
      )}
      {nextHref ? (
        <Link href={nextHref} className="text-xs font-semibold px-3.5 py-2 rounded-full border border-border bg-white text-text cursor-pointer">
          Next →
        </Link>
      ) : (
        <span className="text-xs font-semibold px-3.5 py-2 rounded-full border border-border-soft text-faint">Next →</span>
      )}
    </div>
  );
}
