import { describe, expect, it } from "vitest";
import {
  canAccessOrganization,
  MembershipRoles,
  type OrganizationAction,
} from "../../app/lib/server/authorization";

describe("organization authorization policy", () => {
  const actions: OrganizationAction[] = ["read", "create", "update", "delete"];

  it("enforces the complete role-action matrix", () => {
    const allowed: Record<
      (typeof MembershipRoles)[number],
      OrganizationAction[]
    > = {
      owner: actions,
      admin: actions,
      member: ["read", "create", "update"],
      viewer: ["read"],
    };

    for (const role of MembershipRoles) {
      for (const action of actions) {
        expect(canAccessOrganization(role, action)).toBe(
          allowed[role].includes(action),
        );
      }
    }
  });

  it("denies absent memberships without revealing resource state", () => {
    expect(canAccessOrganization(undefined, "read")).toBe(false);
    expect(canAccessOrganization(null, "delete")).toBe(false);
  });
});
