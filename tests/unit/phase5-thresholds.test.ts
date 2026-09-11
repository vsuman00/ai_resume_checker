import { describe, expect, it } from "vitest";
import {
  validatePhase5Thresholds,
  type Phase5BenchmarkReport,
  type Phase5Thresholds,
} from "~/lib/server/phase5-thresholds";

const report: Phase5BenchmarkReport = {
  parser: {
    aggregate: { precision: 1, recall: 1 },
    sections: { f1: 0.95 },
  },
  matching: { precision: 1, recall: 1 },
  latencyMs: { p95: 0.7 },
  failureRate: 0,
};

describe("Phase 5 approved thresholds", () => {
  it("enforces approved quality and latency minimums", () => {
    const thresholds: Phase5Thresholds = {
      status: "approved",
      approvedMinimums: {
        fieldPrecision: 0.95,
        fieldRecall: 0.95,
        sectionF1: 0.9,
        matchPrecision: 0.95,
        matchRecall: 0.95,
        maxFailureRate: 0,
        maxP95LatencyMs: 10,
      },
    };

    expect(validatePhase5Thresholds(thresholds, report)).toEqual({
      enforced: true,
      status: "approved",
      failures: [],
    });
  });

  it("reports regressions instead of silently passing them", () => {
    const thresholds: Phase5Thresholds = {
      status: "approved",
      approvedMinimums: {
        fieldPrecision: 1,
        fieldRecall: 1,
        sectionF1: 0.96,
        matchPrecision: 1,
        matchRecall: 1,
        maxFailureRate: 0,
        maxP95LatencyMs: 0.5,
      },
    };

    expect(validatePhase5Thresholds(thresholds, report).failures).toEqual([
      ["sectionF1", 0.95, 0.96],
      ["p95LatencyMs", 0.7, 0.5],
    ]);
  });

  it("does not claim enforcement while approval is pending", () => {
    expect(
      validatePhase5Thresholds(
        { status: "pending_human_approval", approvedMinimums: null },
        report,
      ),
    ).toEqual({
      enforced: false,
      status: "pending_human_approval",
    });
  });
});
