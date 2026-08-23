export const SAMPLE_STATUSES = [
  "Pending Login",
  "In Testing",
  "Awaiting Supervisor Review",
  "Awaiting QA Approval",
  "Complete",
  "Rejected",
] as const;

export type SampleStatus = (typeof SAMPLE_STATUSES)[number];

export const STATUS_STYLES: Record<SampleStatus, { bg: string; color: string }> = {
  "Pending Login": { bg: "#EEF2F5", color: "#5B6B74" },
  "In Testing": { bg: "#E8F4FA", color: "#1A5F7A" },
  "Awaiting Supervisor Review": { bg: "#FEF3E0", color: "#9A6100" },
  "Awaiting QA Approval": { bg: "#FEF3E0", color: "#9A6100" },
  Complete: { bg: "#E6F4EA", color: "#1E7A34" },
  Rejected: { bg: "#FDECEA", color: "#B00016" },
};

export const CUSTODY_DOT_COLOR: Record<SampleStatus, string> = {
  "Pending Login": "#93A6B0",
  "In Testing": "#2B8DB8",
  "Awaiting Supervisor Review": "#F5A623",
  "Awaiting QA Approval": "#F5A623",
  Complete: "#28A745",
  Rejected: "#D0021B",
};

export const SAMPLE_STATUS_SHORT: Record<SampleStatus, string> = {
  "Pending Login": "Pending",
  "In Testing": "Testing",
  "Awaiting Supervisor Review": "Awaiting Supervisor",
  "Awaiting QA Approval": "Awaiting QA",
  Complete: "Complete",
  Rejected: "Rejected",
};

export type TestStatus = "pending" | "awaiting" | "complete";

export const TEST_STATUS_STYLES: Record<
  TestStatus,
  { label: string; bg: string; color: string }
> = {
  pending: { label: "Not Started", bg: "#EEF2F5", color: "#5B6B74" },
  awaiting: { label: "Awaiting QA", bg: "#FEF3E0", color: "#9A6100" },
  complete: { label: "Reviewed", bg: "#E6F4EA", color: "#1E7A34" },
};
