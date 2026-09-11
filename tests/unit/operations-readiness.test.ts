import { describe, expect, it } from "vitest";
import {
  createSyntheticLoadReport,
  percentile,
} from "../../app/lib/server/load-scenario";
import {
  createBackupManifest,
  verifyRestoredSnapshot,
} from "../../app/lib/server/backup-restore";

describe("operations readiness", () => {
  it("computes deterministic load percentiles", () => {
    expect(percentile([10, 20, 30, 40], 0.95)).toBe(40);
    const report = createSyntheticLoadReport({
      analyses: 100,
      concurrency: 5,
      providerThrottleEvery: 0,
    });
    expect(report.status).toBe("pass");
    expect(report.acceptance.p95Ms).toBeLessThan(1_000);
    expect(report.queue.peakDepth).toBeGreaterThan(0);
    expect(report.recovery.workerKillReclaimed).toBe(true);
    expect(report.errors.total).toBe(0);
  });

  it("fails the synthetic report when provider throttling exceeds the error budget", () => {
    const report = createSyntheticLoadReport({
      analyses: 100,
      concurrency: 5,
      providerThrottleEvery: 2,
    });
    expect(report.status).toBe("fail");
    expect(report.errors.rate).toBeGreaterThan(0.01);
  });

  it("verifies a backup restore with ownership and checksum integrity", () => {
    const manifest = createBackupManifest({
      createdAt: "2026-09-11T00:00:00.000Z",
      records: [
        {
          table: "resumes",
          id: "resume-1",
          ownerId: "user-1",
          checksum: "resume-checksum",
        },
        {
          table: "analyses",
          id: "analysis-1",
          ownerId: "user-1",
          checksum: "analysis-checksum",
        },
      ],
      objects: [
        {
          storageKey: "organizations/org-1/resumes/resume-1/v1.pdf",
          checksum: "pdf-checksum",
        },
      ],
    });
    expect(verifyRestoredSnapshot(manifest, structuredClone(manifest))).toEqual(
      {
        ok: true,
        reason: "integrity_verified",
      },
    );
    expect(
      verifyRestoredSnapshot(manifest, {
        ...manifest,
        records: manifest.records.map((record) => ({
          ...record,
          ownerId: "other-user",
        })),
      }),
    ).toEqual({ ok: false, reason: "ownership_mismatch" });
  });
});
