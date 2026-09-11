import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { parseSim } from "../app/lib/server/parseSim";
import { scoreExtractedResume } from "../app/lib/server/scoring-stage";
import { matchJobDescription } from "../app/lib/server/matching";
import {
  validatePhase5Thresholds,
  type Phase5Thresholds,
} from "../app/lib/server/phase5-thresholds";

type Counts = {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
};
type ParsingFixture = {
  id: string;
  text: string;
  expected: {
    contact: Record<"name" | "email" | "phone" | "location", string | null> & {
      links: string[];
    };
    sections: string[];
  };
};
type MatchingFixture = {
  id: string;
  jobDescription: string;
  resumeText: string;
  expected: { terms: string[]; matched: string[] };
};
function loadJson<T>(path: string): T {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), "utf8")) as T;
}

function emptyCounts(): Counts {
  return { truePositive: 0, falsePositive: 0, falseNegative: 0 };
}

function ratio(numerator: number, denominator: number) {
  return denominator === 0 ? 1 : numerator / denominator;
}

function quality(counts: Counts) {
  const precision = ratio(
    counts.truePositive,
    counts.truePositive + counts.falsePositive,
  );
  const recall = ratio(
    counts.truePositive,
    counts.truePositive + counts.falseNegative,
  );
  return {
    ...counts,
    precision,
    recall,
    f1: ratio(2 * precision * recall, precision + recall),
  };
}

function recordValue(
  counts: Counts,
  actual: string | null,
  expected: string | null,
) {
  if (actual === expected) {
    if (expected !== null) counts.truePositive += 1;
    return;
  }
  if (actual !== null) counts.falsePositive += 1;
  if (expected !== null) counts.falseNegative += 1;
}

function recordLabels(
  counts: Counts,
  actual: readonly string[],
  expected: readonly string[],
) {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  for (const value of actualSet) {
    if (expectedSet.has(value)) counts.truePositive += 1;
    else counts.falsePositive += 1;
  }
  for (const value of expectedSet) {
    if (!actualSet.has(value)) counts.falseNegative += 1;
  }
}

function percentile(values: number[], percentileValue: number) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[
    Math.min(sorted.length - 1, Math.ceil(sorted.length * percentileValue) - 1)
  ];
}

function runBenchmark() {
  const parsing = loadJson<{ fixtures: ParsingFixture[] }>(
    "../tests/fixtures/parsing/t051-labeled.json",
  ).fixtures;
  const matching = loadJson<{ fixtures: MatchingFixture[] }>(
    "../tests/fixtures/matching/t052-labeled.json",
  ).fixtures;
  const fieldCounts = emptyCounts();
  const sectionCounts = emptyCounts();
  const matchCounts = emptyCounts();
  const latencyMs: number[] = [];
  let failures = 0;
  let runs = 0;

  for (const fixture of parsing) {
    try {
      const result = parseSim({ text: fixture.text, totalPages: 1 });
      for (const field of ["name", "email", "phone", "location"] as const) {
        recordValue(
          fieldCounts,
          result.contact[field],
          fixture.expected.contact[field],
        );
      }
      recordLabels(
        fieldCounts,
        result.contact.links,
        fixture.expected.contact.links,
      );
      recordLabels(
        sectionCounts,
        result.sections.map((section) => section.type),
        fixture.expected.sections,
      );
    } catch {
      failures += 1;
    }
    runs += 1;
  }

  for (const fixture of matching) {
    try {
      const result = matchJobDescription({
        jobDescription: fixture.jobDescription,
        resumeText: fixture.resumeText,
      });
      recordLabels(matchCounts, result.matched, fixture.expected.matched);
    } catch {
      failures += 1;
    }
    runs += 1;
  }

  let varianceFailures = 0;
  for (const fixture of matching) {
    const start = performance.now();
    const first = scoreExtractedResume({
      text: fixture.resumeText,
      pageCount: 1,
      jobDescription: fixture.jobDescription,
      textChecksum: "a".repeat(64),
    });
    const second = scoreExtractedResume({
      text: fixture.resumeText,
      pageCount: 1,
      jobDescription: fixture.jobDescription,
      textChecksum: "a".repeat(64),
    });
    latencyMs.push(performance.now() - start);
    if (first.resultChecksum !== second.resultChecksum) varianceFailures += 1;
  }

  return {
    corpus: {
      parsingFixtures: parsing.length,
      matchingFixtures: matching.length,
    },
    parser: {
      aggregate: quality(fieldCounts),
      sections: quality(sectionCounts),
    },
    matching: quality(matchCounts),
    deterministicVariance: {
      differingRuns: varianceFailures,
      totalPairs: matching.length,
    },
    latencyMs: {
      p50: percentile(latencyMs, 0.5),
      p95: percentile(latencyMs, 0.95),
      max: percentile(latencyMs, 1),
    },
    costMicros: 0,
    failureRate: ratio(failures, runs),
  };
}

const report = runBenchmark();
const thresholds = loadJson<Phase5Thresholds>(
  "../benchmarks/phase5-thresholds.json",
);
const thresholdCheck = validatePhase5Thresholds(thresholds, report);
console.log(JSON.stringify({ ...report, thresholdCheck }, null, 2));
if (thresholdCheck.enforced && (thresholdCheck.failures?.length ?? 0) > 0) {
  process.exitCode = 1;
}
