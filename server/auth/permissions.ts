import type { AccessRole } from "@/db/schema";

type PermissionUser = {
  accessRole: AccessRole;
  departmentSlug?: string | null;
};

export function canManageUsers(user: PermissionUser) {
  return user.accessRole === "boss" || user.accessRole === "hr_ops";
}

export function canViewCompanyDashboard(user: PermissionUser) {
  return user.accessRole === "boss" || user.accessRole === "hr_ops";
}

export function canManagePlanner(user: PermissionUser) {
  return user.accessRole === "boss" || user.accessRole === "hr_ops" || user.accessRole === "lead";
}

export function canUseAiMasterBrain(user: PermissionUser) {
  return user.accessRole === "boss" || (user.accessRole === "hr_ops" && user.departmentSlug === "hr");
}
