import { describe, expect, it } from "vitest";
import { buildNativeEvidence } from "../../app/lib/server/native-evidence";
import { NativeEvidenceSchema } from "../../app/lib/server/native-evidence-schema";

function graph() {
  return buildNativeEvidence([
    "Alex Example\n😀 Notes\nalex@example.test\n+1 202 555 0100",
    "Skills\nTypeScript\n",
  ]);
}

describe("legacy native evidence runtime contract", () => {
  it("preserves source bytes, code-point ranges and uncalibrated states", () => {
    const source = graph();
    const before = structuredClone(source);
    expect(NativeEvidenceSchema.parse(source)).toEqual(before);
    expect(source).toEqual(before);
    expect(
      source.spans.find((span) => span.text === "alex@example.test")?.start,
    ).toBe(21);
  });

  it("keeps missing assertions explicitly unevaluated, not confirmed", () => {
    const parsed = NativeEvidenceSchema.parse(buildNativeEvidence([""]));
    expect(
      parsed.assertions.every((item) => item.state === "not_evaluated"),
    ).toBe(true);
  });

  it.each([
    [
      "unknown version",
      (g: ReturnType<typeof graph>) =>
        Object.assign(g, { schemaVersion: "evidence-v99" }),
    ],
    [
      "foreign page identity",
      (g: ReturnType<typeof graph>) => {
        g.pages[0].id = "page-99";
      },
    ],
    [
      "duplicate page",
      (g: ReturnType<typeof graph>) => {
        g.pages[1] = structuredClone(g.pages[0]);
      },
    ],
    [
      "duplicate span",
      (g: ReturnType<typeof graph>) => {
        g.spans[1] = structuredClone(g.spans[0]);
      },
    ],
    [
      "missing span",
      (g: ReturnType<typeof graph>) => {
        g.spans.pop();
      },
    ],
    [
      "foreign span page",
      (g: ReturnType<typeof graph>) => {
        g.spans[0].pageId = "page-99";
      },
    ],
    [
      "fabricated span text",
      (g: ReturnType<typeof graph>) => {
        g.spans[0].text = "Invented Employer";
      },
    ],
    [
      "fractional offset",
      (g: ReturnType<typeof graph>) => {
        g.spans[0].start = 0.5;
      },
    ],
    [
      "nonfinite offset",
      (g: ReturnType<typeof graph>) => {
        g.spans[0].end = Infinity;
      },
    ],
    [
      "out of range",
      (g: ReturnType<typeof graph>) => {
        g.spans[0].end = 999;
      },
    ],
    [
      "fabricated assertion",
      (g: ReturnType<typeof graph>) => {
        g.assertions[0].value = "Invented Employer";
      },
    ],
    [
      "unknown assertion source",
      (g: ReturnType<typeof graph>) => {
        g.assertions[0].evidence!.spanId = "unknown";
      },
    ],
    [
      "empty assertion range",
      (g: ReturnType<typeof graph>) => {
        g.assertions[0].evidence!.end = 0;
      },
    ],
    [
      "missing assertion evidence",
      (g: ReturnType<typeof graph>) => {
        g.assertions[0].evidence = null;
      },
    ],
    [
      "unevaluated value",
      (g: ReturnType<typeof graph>) => {
        g.assertions[0].state = "not_evaluated";
      },
    ],
    [
      "duplicate assertion field",
      (g: ReturnType<typeof graph>) => {
        g.assertions[1].field = "name";
      },
    ],
    [
      "missing assertion",
      (g: ReturnType<typeof graph>) => {
        g.assertions.pop();
      },
    ],
    [
      "calibration invented",
      (g: ReturnType<typeof graph>) =>
        Object.assign(g.assertions[0], { confidence: "calibrated" }),
    ],
    [
      "confirmation invented",
      (g: ReturnType<typeof graph>) =>
        Object.assign(g.assertions[0], { state: "verified" }),
    ],
  ])("rejects %s", (_name, mutate) => {
    const source = graph();
    mutate(source);
    expect(NativeEvidenceSchema.safeParse(source).success).toBe(false);
  });

  it("rejects an unknown contract field instead of silently stripping it", () => {
    expect(
      NativeEvidenceSchema.safeParse({ ...graph(), authoritativeScore: 100 })
        .success,
    ).toBe(false);
  });
});
