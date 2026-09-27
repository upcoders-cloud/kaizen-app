// Helpery ról (PLAN.md sekcja 2). Jedno źródło prawdy dla guardów, nawigacji i akcji.

export interface RoleUser {
  role?: string | null;
  is_staff?: boolean;
  is_superuser?: boolean;
  permissions?: { is_admin?: boolean; is_approver?: boolean; is_management?: boolean } | null;
}

const APPROVER_ROLES = new Set(["TEAM_LEAD", "MANAGER", "DIRECTOR"]);
const MANAGEMENT_ROLES = new Set(["MANAGER", "DIRECTOR"]);

export function isAdmin(u: RoleUser | null | undefined): boolean {
  if (!u) return false;
  return !!(u.permissions?.is_admin || u.is_staff || u.is_superuser);
}

export function isApprover(u: RoleUser | null | undefined): boolean {
  if (!u) return false;
  return !!(u.permissions?.is_approver || APPROVER_ROLES.has(u.role ?? "") || isAdmin(u));
}

export function isManagement(u: RoleUser | null | undefined): boolean {
  if (!u) return false;
  return !!(u.permissions?.is_management || MANAGEMENT_ROLES.has(u.role ?? "") || isAdmin(u));
}

export type AccessLevel = "all" | "approver" | "management" | "admin";

export function hasLevel(u: RoleUser | null | undefined, level: AccessLevel) {
  switch (level) {
    case "all":
      return !!u;
    case "approver":
      return isApprover(u);
    case "management":
      return isManagement(u);
    case "admin":
      return isAdmin(u);
  }
}

/** Prefiks route -> wymagany poziom. Dłuższe prefiksy mają pierwszeństwo. */
export const ROUTE_ACCESS: [prefix: string, level: AccessLevel][] = [
  ["/admin", "admin"],
  ["/implementation", "management"],
  ["/dashboard", "management"],
  ["/departments", "management"],
  ["/reports", "management"],
  ["/approvals", "approver"],
  ["/team", "approver"],
];

export function requiredLevel(pathname: string): AccessLevel {
  const match = ROUTE_ACCESS.filter(
    ([p]) => pathname === p || pathname.startsWith(p + "/"),
  ).sort((a, b) => b[0].length - a[0].length)[0];
  return match?.[1] ?? "all";
}

export function canAccess(u: RoleUser | null | undefined, pathname: string) {
  return hasLevel(u, requiredLevel(pathname));
}
