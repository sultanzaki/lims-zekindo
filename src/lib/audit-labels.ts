export type AuditCategory = "create" | "approve" | "reject" | "update" | "remove" | "security";

export const AUDIT_CATEGORY_STYLE: Record<AuditCategory, { label: string; bg: string; color: string }> = {
  create: { label: "Created", bg: "#E8F4FA", color: "#1A5F7A" },
  approve: { label: "Approved", bg: "#E6F4EA", color: "#1E7A34" },
  reject: { label: "Rejected", bg: "#FDECEA", color: "#B00016" },
  update: { label: "Updated", bg: "#FEF3E0", color: "#9A6100" },
  remove: { label: "Removed", bg: "#FDECEA", color: "#B00016" },
  security: { label: "Security", bg: "#E8F4FA", color: "#1A5F7A" },
};

const ACTION_INFO: Record<string, { label: string; category: AuditCategory }> = {
  "sample.created": { label: "Sample logged", category: "create" },
  "sample.disposed": { label: "Sample disposed", category: "remove" },
  "sample.qa_approved": { label: "QA approved sample", category: "approve" },
  "sample.qa_rejected": { label: "QA rejected sample", category: "reject" },
  "sample.retest_created": { label: "Retest created", category: "create" },
  "sample.storage_updated": { label: "Storage location updated", category: "update" },
  "sample.supervisor_approved": { label: "Supervisor endorsed sample", category: "approve" },
  "sample.supervisor_rejected": { label: "Supervisor rejected sample", category: "reject" },
  "test.attachment_added": { label: "Attachment added", category: "create" },
  "test.attachment_removed": { label: "Attachment removed", category: "remove" },
  "test.reading_added": { label: "Reading added", category: "update" },
  "test.reading_removed": { label: "Reading removed", category: "remove" },
  "test.result_submitted": { label: "Result submitted", category: "update" },
  "catalog.sample_type_created": { label: "Sample type added", category: "create" },
  "catalog.sample_type_activated": { label: "Sample type activated", category: "approve" },
  "catalog.sample_type_deactivated": { label: "Sample type deactivated", category: "remove" },
  "catalog.test_created": { label: "Test definition added", category: "create" },
  "catalog.test_activated": { label: "Test definition activated", category: "approve" },
  "catalog.test_deactivated": { label: "Test definition deactivated", category: "remove" },
  "deviation.updated": { label: "Deviation updated", category: "update" },
  "deviation.closed": { label: "Deviation closed", category: "approve" },
  "equipment.calibrated": { label: "Equipment calibration logged", category: "update" },
  "equipment.created": { label: "Equipment added", category: "create" },
  "equipment.status_changed": { label: "Equipment status changed", category: "update" },
  "reagent.created": { label: "Reagent added", category: "create" },
  "reagent.quantity_updated": { label: "Reagent quantity updated", category: "update" },
  "user.created": { label: "User account created", category: "create" },
  "user.password_reset": { label: "Password reset", category: "security" },
  "user.reactivated": { label: "User account reactivated", category: "approve" },
  "user.deactivated": { label: "User account deactivated", category: "security" },
};

export function auditActionInfo(action: string): { label: string; category: AuditCategory } {
  return ACTION_INFO[action] ?? { label: action, category: "update" };
}
