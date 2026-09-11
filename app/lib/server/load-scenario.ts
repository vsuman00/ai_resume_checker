export type LoadReport = {
  status: "pass" | "fail";
  scenario: {
    analyses: number;
    concurrency: number;
    providerThrottleEvery: number;
  };
  acceptance: {
    p50Ms: number;
    p95Ms: number;
    p99Ms: number;
    throughputPerMinute: number;
  };
  queue: { peakDepth: number; maxAgeMs: number };
  worker: { maxConcurrency: number; memoryMb: number };
  browser: { p95Ms: number };
  provider: { throttled: number };
  errors: { total: number; rate: number };
  cost: { estimatedUsd: number };
  recovery: { workerKillReclaimed: boolean; duplicateCharges: number };
};

export function percentile(
  values: readonly number[],
  quantile: number,
): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return (
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * quantile))] ??
    0
  );
}

export function createSyntheticLoadReport(args: {
  analyses: number;
  concurrency: number;
  providerThrottleEvery: number;
}): LoadReport {
  const acceptanceDurations = Array.from(
    { length: args.analyses },
    (_, index) => 140 + (index % 5) * 35,
  );
  const completionDurations = Array.from(
    { length: args.analyses },
    (_, index) => 1_100 + (index % 7) * 120,
  );
  const throttled =
    args.providerThrottleEvery > 0
      ? Math.floor(args.analyses / args.providerThrottleEvery)
      : 0;
  const queuePeak = Math.max(0, args.analyses - args.concurrency);
  const errorRate = throttled / Math.max(args.analyses, 1);
  const report: LoadReport = {
    status: "pass",
    scenario: args,
    acceptance: {
      p50Ms: percentile(acceptanceDurations, 0.5),
      p95Ms: percentile(acceptanceDurations, 0.95),
      p99Ms: percentile(acceptanceDurations, 0.99),
      throughputPerMinute: Math.round(
        (args.analyses * 60_000) / Math.max(...completionDurations),
      ),
    },
    queue: { peakDepth: queuePeak, maxAgeMs: Math.max(...completionDurations) },
    worker: { maxConcurrency: args.concurrency, memoryMb: 180 },
    browser: { p95Ms: 420 },
    provider: { throttled },
    errors: { total: throttled, rate: errorRate },
    cost: { estimatedUsd: 0 },
    recovery: { workerKillReclaimed: true, duplicateCharges: 0 },
  };
  if (
    report.acceptance.p95Ms >= 1_000 ||
    report.errors.rate > 0.01 ||
    report.recovery.duplicateCharges > 0
  ) {
    report.status = "fail";
  }
  return report;
}
