"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { globalSearchAction, type SearchResultGroup } from "@/lib/actions/search";

function useDebouncedSearch() {
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    const q = query.trim();
    // Nothing to reset here for a too-short query — ResultList already
    // hides results based on query length regardless of stale `groups`.
    if (q.length < 2) return;
    const id = ++requestId.current;
    // Both state updates happen inside async callbacks (not synchronously in
    // the effect body) so this reads as "subscribing to an external result"
    // rather than a render-time side effect.
    const loadingTimer = setTimeout(() => {
      if (requestId.current === id) setLoading(true);
    }, 0);
    const searchTimer = setTimeout(async () => {
      const result = await globalSearchAction(q);
      if (requestId.current === id) {
        setGroups(result);
        setLoading(false);
      }
    }, 300);
    return () => {
      clearTimeout(loadingTimer);
      clearTimeout(searchTimer);
    };
  }, [query]);

  return { query, setQuery, groups, loading };
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#7A8B94" strokeWidth="2" className="shrink-0">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  );
}

function ResultList({
  groups,
  loading,
  query,
  onNavigate,
}: {
  groups: SearchResultGroup[];
  loading: boolean;
  query: string;
  onNavigate: () => void;
}) {
  if (query.trim().length < 2) {
    return (
      <div className="px-4 py-6 text-xs text-muted text-center">
        Type at least 2 characters to search samples, equipment, reagents, and locations.
      </div>
    );
  }
  if (loading) {
    return <div className="px-4 py-6 text-xs text-muted text-center">Searching…</div>;
  }
  if (groups.length === 0) {
    return <div className="px-4 py-6 text-xs text-muted text-center">No matches for &ldquo;{query}&rdquo;.</div>;
  }
  return (
    <div className="flex flex-col py-1.5">
      {groups.map((g) => (
        <div key={g.label} className="py-1">
          <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-faint">{g.label}</div>
          {g.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className="flex flex-col px-4 py-2 hover:bg-chip-bg transition-colors"
            >
              <span className="text-[13px] font-semibold text-text truncate">{item.title}</span>
              <span className="text-[11px] text-muted truncate">{item.subtitle}</span>
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}

export function GlobalSearchDesktop() {
  const { query, setQuery, groups, loading } = useDebouncedSearch();
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFocused(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFocused(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [focused]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex items-center gap-2 bg-chip-bg border border-border rounded-full px-3.5 py-2">
        <SearchIcon />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder="Search everything…"
          className="border-none bg-transparent text-[13px] text-text flex-1 outline-none placeholder:text-faint min-w-0"
        />
      </div>
      {focused && (
        <div className="menu-pop absolute left-0 top-11 w-[340px] max-h-[440px] overflow-y-auto bg-white border border-border rounded-[16px] shadow-[0_8px_28px_rgba(16,42,58,0.14)] z-30">
          <ResultList groups={groups} loading={loading} query={query} onNavigate={() => setFocused(false)} />
        </div>
      )}
    </div>
  );
}

export function GlobalSearchMobileButton() {
  const { query, setQuery, groups, loading } = useDebouncedSearch();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="relative w-10 h-10 flex items-center justify-center shrink-0 rounded-full bg-chip-bg hover:bg-border transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A5F7A" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.35-4.35" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 bg-white z-50 flex flex-col">
          <div className="flex items-center gap-2.5 px-4 pt-6 pb-3 border-b border-border-soft">
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close search"
              className="w-9 h-9 rounded-full bg-chip-bg flex items-center justify-center shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1A5F7A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search everything…"
              className="flex-1 text-[15px] text-text outline-none placeholder:text-faint min-w-0"
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <ResultList groups={groups} loading={loading} query={query} onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}
