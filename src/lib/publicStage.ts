// Pure, dependency-free stage/label helpers shared by the public sample
// surfaces. Kept separate from publicSample.ts (which pulls in server-only
// data loading via lib/storage) so client components — like the portal's
// search/filter list — can import just this without dragging a server-only
// module into the client bundle.
export function stageIndexFor(status: string): number {
  switch (status) {
    case "Pending Login":
      return 0;
    case "In Testing":
      return 1;
    case "Awaiting Supervisor Review":
    case "Awaiting QA Approval":
      return 2;
    case "Complete":
      return 3;
    default:
      return 0;
  }
}

const CLIENT_STAGE_LABELS = ["Received", "Testing In Progress", "Under Review", "Completed"] as const;

// The same client-friendly vocabulary /track already uses for its stage
// timeline, reused for the BU portal's sample list rows — internal status
// strings like "Awaiting QA Approval" stay internal-only.
export function clientStageLabel(status: string): string {
  if (status === "Rejected") return "Needs Attention";
  return CLIENT_STAGE_LABELS[stageIndexFor(status)];
}

export function clientStageColors(status: string): { bg: string; color: string } {
  if (status === "Rejected") return { bg: "#FDECEA", color: "#B00016" };
  if (status === "Complete") return { bg: "#E6F4EA", color: "#1E7A34" };
  const idx = stageIndexFor(status);
  return idx >= 2 ? { bg: "#FEF3E0", color: "#9A6100" } : { bg: "#E8F4FA", color: "#1A5F7A" };
}
