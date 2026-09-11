import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { DatabaseTransactionBoundary } from "../../app/lib/server/database";

describe("database transaction boundary", () => {
  it("returns a schema-validated atomic operation result", async () => {
    const execute = vi.fn().mockResolvedValue({
      data: { userId: "user-1", organizationId: "organization-1" },
      error: null,
    });
    const boundary = new DatabaseTransactionBoundary(execute);

    const result = await boundary.run(
      "bootstrap_personal_workspace",
      { p_user_id: "user-1" },
      z.object({ userId: z.string(), organizationId: z.string() }),
    );

    expect(result.organizationId).toBe("organization-1");
    expect(execute).toHaveBeenCalledOnce();
  });

  it("maps provider errors to a stable persistence error", async () => {
    const boundary = new DatabaseTransactionBoundary(async () => ({
      data: null,
      error: { code: "23505", message: "sensitive provider detail" },
    }));

    await expect(
      boundary.run("operation", {}, z.boolean()),
    ).rejects.toMatchObject({
      name: "PersistenceError",
      code: "23505",
      message: "The persistence operation failed.",
    });
  });

  it("rejects invalid database response shapes", async () => {
    const boundary = new DatabaseTransactionBoundary(async () => ({
      data: { unexpected: true },
      error: null,
    }));

    await expect(
      boundary.run("operation", {}, z.object({ id: z.string() })),
    ).rejects.toMatchObject({
      code: "DATABASE_RESULT_INVALID",
    });
  });
});
