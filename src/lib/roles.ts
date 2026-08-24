export const ACCESS_ROLES = ["TECHNICIAN", "SUPERVISOR", "QA_MANAGER", "ADMIN"] as const;
export type AccessRole = (typeof ACCESS_ROLES)[number];

export const ROLE_LABELS: Record<AccessRole, string> = {
  TECHNICIAN: "Technician",
  SUPERVISOR: "Supervisor",
  QA_MANAGER: "QA Manager",
  ADMIN: "Lab Manager (Admin)",
};

export function canReviewAsSupervisor(role: string) {
  return role === "SUPERVISOR" || role === "ADMIN";
}

export function canApproveAsQa(role: string) {
  return role === "QA_MANAGER" || role === "ADMIN";
}

export function isAdmin(role: string) {
  return role === "ADMIN";
}

export function canManageInventoryAndCatalog(role: string) {
  return role === "ADMIN" || role === "QA_MANAGER";
}

export function canViewAnalytics(role: string) {
  return role === "SUPERVISOR" || role === "QA_MANAGER" || role === "ADMIN";
}
