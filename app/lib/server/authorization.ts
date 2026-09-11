export const MembershipRoles = ["owner", "admin", "member", "viewer"] as const;

export type MembershipRole = (typeof MembershipRoles)[number];
export type OrganizationAction = "read" | "create" | "update" | "delete";

const permissions: Record<MembershipRole, readonly OrganizationAction[]> = {
  owner: ["read", "create", "update", "delete"],
  admin: ["read", "create", "update", "delete"],
  member: ["read", "create", "update"],
  viewer: ["read"],
};

export function canAccessOrganization(
  role: MembershipRole | null | undefined,
  action: OrganizationAction,
): boolean {
  return role ? permissions[role].includes(action) : false;
}

export function hasOrganizationAccess(
  role: MembershipRole | null | undefined,
): boolean {
  return canAccessOrganization(role, "read");
}
