import { describe, expect, it } from "vitest";
import { parseSim } from "../../../app/lib/server/parseSim";
import { ParseViewSchema } from "../../../app/lib/server/schema";
import { parsingFixtures, warningLabels } from "./fixtures";

interface Counts {
  truePositive: number;
  falsePositive: number;
  falseNegative: number;
}

function emptyCounts(): Counts {
  return { truePositive: 0, falsePositive: 0, falseNegative: 0 };
}

function recordValue(
  counts: Counts,
  actual: string | null,
  expected: string | null,
): void {
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
): void {
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  for (const label of actualSet) {
    if (expectedSet.has(label)) counts.truePositive += 1;
    else counts.falsePositive += 1;
  }
  for (const label of expectedSet) {
    if (!actualSet.has(label)) counts.falseNegative += 1;
  }
}

function ratio(numerator: number, denominator: number): number {
  return denominator === 0 ? 1 : numerator / denominator;
}

describe("T051 labeled parser benchmark", () => {
  it("measures exact field, section, and layout-warning precision/recall", () => {
    const metrics: Record<string, Counts> = {
      name: emptyCounts(),
      email: emptyCounts(),
      phone: emptyCounts(),
      location: emptyCounts(),
      links: emptyCounts(),
      sections: emptyCounts(),
      "multi-column warning": emptyCounts(),
      "reading-order warning": emptyCounts(),
    };

    for (const fixture of parsingFixtures) {
      const result = parseSim({ text: fixture.text, totalPages: 1 });
      expect(ParseViewSchema.safeParse(result).success).toBe(true);

      recordValue(
        metrics.name,
        result.contact.name,
        fixture.expected.contact.name,
      );
      recordValue(
        metrics.email,
        result.contact.email,
        fixture.expected.contact.email,
      );
      recordValue(
        metrics.phone,
        result.contact.phone,
        fixture.expected.contact.phone,
      );
      recordValue(
        metrics.location,
        result.contact.location,
        fixture.expected.contact.location,
      );
      recordLabels(
        metrics.links,
        result.contact.links,
        fixture.expected.contact.links,
      );
      recordLabels(
        metrics.sections,
        result.sections.map((section) => section.type),
        fixture.expected.sections,
      );

      const actualWarnings = warningLabels(result.warnings);
      recordLabels(
        metrics["multi-column warning"],
        actualWarnings.filter((label) => label === "multi-column"),
        fixture.expected.warnings.filter((label) => label === "multi-column"),
      );
      recordLabels(
        metrics["reading-order warning"],
        actualWarnings.filter((label) => label === "reading-order"),
        fixture.expected.warnings.filter((label) => label === "reading-order"),
      );
    }

    expect(metrics).toEqual({
      name: { truePositive: 6, falsePositive: 0, falseNegative: 0 },
      email: { truePositive: 6, falsePositive: 0, falseNegative: 0 },
      phone: { truePositive: 5, falsePositive: 0, falseNegative: 0 },
      location: { truePositive: 6, falsePositive: 0, falseNegative: 0 },
      links: { truePositive: 1, falsePositive: 0, falseNegative: 0 },
      sections: { truePositive: 20, falsePositive: 0, falseNegative: 2 },
      "multi-column warning": {
        truePositive: 1,
        falsePositive: 0,
        falseNegative: 0,
      },
      "reading-order warning": {
        truePositive: 2,
        falsePositive: 0,
        falseNegative: 0,
      },
    });

    for (const [field, counts] of Object.entries(metrics)) {
      const precision = ratio(
        counts.truePositive,
        counts.truePositive + counts.falsePositive,
      );
      const recall = ratio(
        counts.truePositive,
        counts.truePositive + counts.falseNegative,
      );
      if (field === "sections") {
        expect(precision).toBe(1);
        expect(recall).toBeCloseTo(0.9091, 4);
      } else {
        expect(precision).toBe(1);
        expect(recall).toBe(1);
      }
    }
  });
});
