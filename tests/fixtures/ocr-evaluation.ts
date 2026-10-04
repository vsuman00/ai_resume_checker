// Diagnostic-only metrics. Synthetic text recovery is not structured field
// precision, human annotation agreement, or representative release validity.
const normalized = (text: string) => text.replace(/\s+/gu, " ").trim();

function distance<T>(reference: T[], actual: T[], insertionCost = 1) {
  let previous = Array.from(
    { length: actual.length + 1 },
    (_, i) => i * insertionCost,
  );
  reference.forEach((value, index) => {
    const row = [index + 1];
    actual.forEach((other, column) => {
      row.push(
        Math.min(
          row[column] + insertionCost,
          previous[column + 1] + 1,
          previous[column] + (value === other ? 0 : 1),
        ),
      );
    });
    previous = row;
  });
  return previous[actual.length];
}

function orderedMatches(reference: string[], actual: string[]) {
  let previous = Array(actual.length + 1).fill(0) as number[];
  for (const line of reference) {
    const row = [0];
    actual.forEach((other, index) =>
      row.push(
        line === other
          ? previous[index] + 1
          : Math.max(row[index], previous[index + 1]),
      ),
    );
    previous = row;
  }
  return previous[actual.length];
}

export function evaluateOcrDocument(expected: string[], actual: string[]) {
  let errors = 0,
    referenceCharacters = 0,
    nonblankPages = 0,
    coveredPages = 0,
    lineCount = 0,
    matchedLines = 0,
    exactPositionLines = 0,
    positionLineDenominator = 0;
  expected.forEach((text, page) => {
    const reference = Array.from(normalized(text));
    const recovered = Array.from(normalized(actual[page] ?? ""));
    referenceCharacters += reference.length;
    errors += distance(reference, recovered);
    if (reference.length) {
      nonblankPages++;
      if (recovered.length) coveredPages++;
    }
    const lines = text.split(/\n/u).map(normalized).filter(Boolean);
    lineCount += lines.length;
    const actualLines = (actual[page] ?? "")
      .split(/\n/u)
      .map(normalized)
      .filter(Boolean);
    positionLineDenominator += Math.max(lines.length, actualLines.length);
    exactPositionLines += lines.filter(
      (line, index) => line === actualLines[index],
    ).length;
    matchedLines += orderedMatches(
      lines,
      (actual[page] ?? "").split(/\n/u).map(normalized).filter(Boolean),
    );
  });
  // Extra output pages also count as insertions, not silent exclusions.
  for (const text of actual.slice(expected.length)) {
    errors += Array.from(normalized(text)).length;
    positionLineDenominator += text
      .split(/\n/u)
      .map(normalized)
      .filter(Boolean).length;
  }
  return {
    errors,
    referenceCharacters,
    characterErrorRate: referenceCharacters
      ? errors / referenceCharacters
      : null,
    pageCoverage: nonblankPages ? coveredPages / nonblankPages : null,
    orderedLineAgreement: lineCount ? matchedLines / lineCount : null,
    referenceLines: lineCount,
    exactPositionLines,
    positionLineDenominator,
    exactPositionLineAgreement: positionLineDenominator
      ? exactPositionLines / positionLineDenominator
      : null,
  };
}

export type OcrObservation = {
  family: string;
  wallMs: number;
  status: string;
  metrics: ReturnType<typeof evaluateOcrDocument>;
};

export function summarizeOcrSegment(
  rows: OcrObservation[],
  maximumCer: number,
) {
  if (
    !rows.length ||
    rows.some((row) => !Number.isFinite(row.wallMs) || row.wallMs < 0)
  )
    throw new Error("Invalid diagnostic observations");
  const aggregate = (sample: OcrObservation[]) => {
    const denominator = sample.reduce(
      (total, row) => total + row.metrics.referenceCharacters,
      0,
    );
    return denominator
      ? sample.reduce((total, row) => total + row.metrics.errors, 0) /
          denominator
      : null;
  };
  const families = [...new Set(rows.map((row) => row.family))];
  const clusters = families.map((family) =>
    rows.filter((row) => row.family === family),
  );
  const resamples = 10_000,
    seed = 20261004;
  let state = seed;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4294967296;
  };
  const distribution: number[] = [];
  if (families.length >= 2)
    for (let i = 0; i < resamples; i++) {
      const sample = Array.from(
        { length: families.length },
        () => clusters[Math.floor(random() * clusters.length)],
      ).flat();
      const value = aggregate(sample);
      if (value !== null) distribution.push(value);
    }
  distribution.sort((a, b) => a - b);
  const quantile = (values: number[], p: number) =>
    values[Math.max(0, Math.ceil(values.length * p) - 1)];
  const interval =
    distribution.length === resamples
      ? [quantile(distribution, 0.025), quantile(distribution, 0.975)]
      : null;
  const latencies = rows.map((row) => row.wallMs).sort((a, b) => a - b);
  const cer = aggregate(rows);
  const mean = (values: Array<number | null>) => {
    const applicable = values.filter(
      (value): value is number => value !== null,
    );
    return applicable.length
      ? applicable.reduce((total, value) => total + value, 0) /
          applicable.length
      : null;
  };
  return {
    documents: rows.length,
    sourceFamilies: families.length,
    characterErrorRate: cer,
    macroPageAvailability: mean(rows.map((row) => row.metrics.pageCoverage)),
    macroOrderedLineAgreement: mean(
      rows.map((row) => row.metrics.orderedLineAgreement),
    ),
    macroExactPositionLineAgreement: mean(
      rows.map((row) => row.metrics.exactPositionLineAgreement),
    ),
    maximumCer,
    screeningGate:
      cer !== null && interval !== null && interval[1] <= maximumCer
        ? "passed"
        : "not_passed",
    confidenceInterval95: interval,
    intervalReason: interval
      ? null
      : families.length < 2
        ? "fewer_than_two_independent_source_families"
        : "empty_reference_in_bootstrap_sample",
    bootstrap: { unit: "source_family", resamples, seed },
    failureRate:
      rows.filter((row) => row.status === "failed").length / rows.length,
    abstentionRate:
      rows.filter((row) => row.status === "insufficient").length / rows.length,
    latencyMs: {
      p50: quantile(latencies, 0.5),
      p95: quantile(latencies, 0.95),
      max: latencies.at(-1),
    },
    apiFeeMicros: 0,
    computeCost: { value: null, reason: "host_rate_unavailable" },
    representativeValidity: "not_evaluated",
  };
}
