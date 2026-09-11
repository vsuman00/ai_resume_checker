export interface Phase5ThresholdMinimums {
  fieldPrecision: number;
  fieldRecall: number;
  sectionF1: number;
  matchPrecision: number;
  matchRecall: number;
  maxFailureRate: number;
  maxP95LatencyMs: number;
}

export interface Phase5Thresholds {
  status: "pending_human_approval" | "approved";
  approvedMinimums: Phase5ThresholdMinimums | null;
}

export interface Phase5BenchmarkReport {
  parser: {
    aggregate: { precision: number; recall: number };
    sections: { f1: number };
  };
  matching: { precision: number; recall: number };
  latencyMs: { p95: number };
  failureRate: number;
}

export function validatePhase5Thresholds(
  thresholds: Phase5Thresholds,
  report: Phase5BenchmarkReport,
) {
  if (thresholds.status !== "approved" || !thresholds.approvedMinimums) {
    return { enforced: false, status: thresholds.status };
  }

  const minimums = thresholds.approvedMinimums;
  const checks: [string, number, number][] = [
    [
      "fieldPrecision",
      report.parser.aggregate.precision,
      minimums.fieldPrecision,
    ],
    ["fieldRecall", report.parser.aggregate.recall, minimums.fieldRecall],
    ["sectionF1", report.parser.sections.f1, minimums.sectionF1],
    ["matchPrecision", report.matching.precision, minimums.matchPrecision],
    ["matchRecall", report.matching.recall, minimums.matchRecall],
  ];
  const failures: [string, number, number][] = [];
  for (const check of checks) {
    if (check[1] < check[2]) failures.push(check);
  }

  if (report.failureRate > minimums.maxFailureRate) {
    failures.push(["failureRate", report.failureRate, minimums.maxFailureRate]);
  }
  if (report.latencyMs.p95 > minimums.maxP95LatencyMs) {
    failures.push([
      "p95LatencyMs",
      report.latencyMs.p95,
      minimums.maxP95LatencyMs,
    ]);
  }

  return { enforced: true, status: thresholds.status, failures };
}
