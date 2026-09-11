import { describe, expect, it, vi } from "vitest";
import {
  buildExportManifest,
  retentionCutoff,
} from "../../app/lib/server/privacy-operations";
import {
  processPrivacyRequest,
  runPrivacyWorkerCycle,
  type PrivacyRequestRepository,
} from "../../app/lib/server/privacy-worker";
import {
  runRetentionSweep,
  type RetentionRepository,
} from "../../app/lib/server/retention";

describe("privacy operations", () => {
  it("builds a versioned export manifest without raw resume text", () => {
    const manifest = buildExportManifest({
      generatedAt: "2026-09-11T00:00:00.000Z",
      account: { id: "user-1" },
      records: {
        analyses: [{ id: "analysis-1", status: "completed" }],
        consents: [
          { purpose: "qualitative_ai", policyVersion: "candidate-ai-v1" },
        ],
      },
      files: [
        {
          storageKey: "organizations/org-1/resumes/resume-1/v1.pdf",
          bytes: 100,
        },
      ],
    });

    expect(manifest.version).toBe("resumide-export-v1");
    expect(manifest.records.analyses).toHaveLength(1);
    expect(manifest.files[0]?.storageKey).toContain("organizations/");
    expect(JSON.stringify(manifest)).not.toContain("extracted_text");
  });

  it("calculates a UTC retention cutoff", () => {
    expect(
      retentionCutoff(new Date("2026-09-11T12:00:00.000Z"), 30).toISOString(),
    ).toBe("2026-08-12T12:00:00.000Z");
  });

  it("completes an export request and is safe to replay", async () => {
    const repository: PrivacyRequestRepository = {
      claim: vi.fn().mockResolvedValue({
        id: "request-1",
        kind: "export",
        userId: "user-1",
        organizationId: "org-1",
        attempt: 1,
        workerId: "privacy-worker-1",
      }),
      buildExportManifest: vi
        .fn()
        .mockResolvedValue({ version: "resumide-export-v1" }),
      prepareDeletion: vi.fn(),
      complete: vi.fn().mockResolvedValue(true),
      fail: vi.fn(),
    };

    expect(await runPrivacyWorkerCycle(repository, "privacy-worker-1")).toBe(
      true,
    );
    expect(repository.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "request-1",
        workerId: "privacy-worker-1",
      }),
      { version: "resumide-export-v1" },
    );
    expect(repository.prepareDeletion).not.toHaveBeenCalled();
  });

  it("deletes every object before completing deletion", async () => {
    const repository: PrivacyRequestRepository = {
      claim: vi.fn().mockResolvedValue({
        id: "request-2",
        kind: "deletion",
        userId: "user-1",
        organizationId: "org-1",
        attempt: 1,
        workerId: "privacy-worker-1",
      }),
      buildExportManifest: vi.fn(),
      prepareDeletion: vi.fn().mockResolvedValue({
        storageObjects: [
          { storageKey: "organizations/org-1/resumes/r-1/v-1.pdf" },
          { storageKey: "organizations/org-1/resumes/r-1/v-2.pdf" },
        ],
      }),
      complete: vi.fn().mockResolvedValue(true),
      fail: vi.fn(),
    };
    const remove = vi.fn().mockResolvedValue(undefined);

    await processPrivacyRequest(repository, remove, {
      id: "request-2",
      kind: "deletion",
      userId: "user-1",
      organizationId: "org-1",
      attempt: 1,
      workerId: "privacy-worker-1",
    });

    expect(remove).toHaveBeenCalledTimes(2);
    expect(repository.complete).toHaveBeenCalledWith(
      expect.objectContaining({ id: "request-2" }),
      { deleted: true },
    );
  });

  it("keeps a retention item retryable when object deletion fails", async () => {
    const repository: RetentionRepository = {
      claimExpiredObjects: vi.fn().mockResolvedValue([
        {
          id: "item-1",
          storageKey: "organizations/org-1/resumes/r-1/v-1.pdf",
        },
      ]),
      complete: vi.fn(),
      fail: vi.fn().mockResolvedValue(undefined),
    };
    await runRetentionSweep(
      repository,
      vi.fn().mockRejectedValue(new Error("storage unavailable")),
      new Date("2026-09-11T00:00:00.000Z"),
      30,
    );
    expect(repository.fail).toHaveBeenCalledWith(
      "item-1",
      "STORAGE_DELETE_FAILED",
    );
    expect(repository.complete).not.toHaveBeenCalled();
  });
});
