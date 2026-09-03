export type CursorPageInfo = {
  hasNext: boolean;
  hasPrev: boolean;
  nextCursor: string | null;
  prevCursor: string | null;
};

// Keyset/cursor pagination stays fast at any depth because it always
// resumes from a specific row's id rather than skipping N rows — unlike
// OFFSET pagination, which gets slower the deeper a user pages. The
// direction-specific fetch mechanics (forward/backward/first-page, plus
// detecting hasNext/hasPrev by asking for one extra row) are the same
// across every list that uses this, so they live here once; each caller
// just supplies its own `findMany` closed over its where/select/orderBy.
//
// Verified against a live Postgres sandbox: forward pages never overlap,
// and paging backward from any page reconstructs the exact same rows the
// forward pass produced.
export async function fetchCursorPage<T extends { id: string }>(
  findMany: (args: { cursor?: { id: string }; skip?: number; take: number }) => Promise<T[]>,
  { after, before, pageSize }: { after?: string; before?: string; pageSize: number }
): Promise<{ rows: T[]; pageInfo: CursorPageInfo }> {
  let rows: T[];
  let hasNext: boolean;
  let hasPrev: boolean;

  if (before) {
    rows = await findMany({ cursor: { id: before }, skip: 1, take: -(pageSize + 1) });
    hasPrev = rows.length > pageSize;
    if (hasPrev) rows = rows.slice(1);
    hasNext = true;
  } else if (after) {
    rows = await findMany({ cursor: { id: after }, skip: 1, take: pageSize + 1 });
    hasNext = rows.length > pageSize;
    if (hasNext) rows = rows.slice(0, pageSize);
    hasPrev = true;
  } else {
    rows = await findMany({ take: pageSize + 1 });
    hasNext = rows.length > pageSize;
    if (hasNext) rows = rows.slice(0, pageSize);
    hasPrev = false;
  }

  return {
    rows,
    pageInfo: {
      hasNext,
      hasPrev,
      nextCursor: rows.length > 0 ? rows[rows.length - 1].id : null,
      prevCursor: rows.length > 0 ? rows[0].id : null,
    },
  };
}
