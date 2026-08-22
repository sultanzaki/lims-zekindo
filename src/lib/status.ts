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
  "Pending Login": { bg: "#F0F4F8", color: "#6B8A96" },
  "In Testing": { bg: "#E8F4FA", color: "#2B8DB8" },
  "Awaiting Supervisor Review": { bg: "#FEF3E0", color: "#a36a00" },
  "Awaiting QA Approval": { bg: "#FDE9D9", color: "#8a4b00" },
  Complete: { bg: "#E6F4EA", color: "#1e7a34" },
  Rejected: { bg: "#FDECEA", color: "#D0021B" },
};

export const CUSTODY_DOT_COLOR: Record<SampleStatus, string> = {
  "Pending Login": "#2B8DB8",
  "In Testing": "#2B8DB8",
  "Awaiting Supervisor Review": "#F5A623",
  "Awaiting QA Approval": "#F5A623",
  Complete: "#28A745",
  Rejected: "#D0021B",
};

export type TestStatus = "pending" | "awaiting" | "complete";

export const TEST_STATUS_STYLES: Record<
  TestStatus,
  { label: string; bg: string; color: string }
> = {
  pending: { label: "Not Started", bg: "#F0F4F8", color: "#6B8A96" },
  awaiting: { label: "Awaiting Review", bg: "#FEF3E0", color: "#a36a00" },
  complete: { label: "Complete", bg: "#E6F4EA", color: "#1e7a34" },
};

// Fallback seed list — real sample types are managed via SampleTypeCatalog (see /admin/catalog).
export const SAMPLE_TYPE_OPTIONS = [
  "Total Plate Count",
  "Coliform / E. coli",
  "Yeast & Mold",
  "Sterility Test",
  "Environmental Swab",
  "Water Activity",
  "Endotoxin (LAL)",
  "Bioburden",
];
