import { describe, expect, it } from "vitest";
import {
  evaluateOcrDocument,
  summarizeOcrSegment,
} from "../../fixtures/ocr-evaluation";

describe("OCR diagnostic metrics", () => {
  it("penalizes extra lines and pages in exact-position agreement", () => {
    expect(
      evaluateOcrDocument(["A"], ["A\nB"]).exactPositionLineAgreement,
    ).toBe(0.5);
    expect(
      evaluateOcrDocument(["A"], ["A", "B"]).exactPositionLineAgreement,
    ).toBe(0.5);
  });
  it("distinguishes exact-position lines from subsequence ordering", () => {
    const result = evaluateOcrDocument(["FIRST\nSECOND"], ["SECOND\nFIRST"]);
    expect(result).toMatchObject({
      exactPositionLineAgreement: 0,
      referenceLines: 2,
      exactPositionLines: 0,
    });
  });
  it("counts missing lines as errors for exact-position agreement", () => {
    const result = evaluateOcrDocument(["A\nB\nC"], ["A\nC"]);
    expect(result).toMatchObject({
      exactPositionLineAgreement: 1 / 3,
      referenceLines: 3,
      exactPositionLines: 1,
    });
  });
  it("counts Unicode code points and normalizes only whitespace", () => {
    const result = evaluateOcrDocument(["A 😀\nB"], ["A X B"]);
    expect(result.errors).toBe(1);
    expect(result.referenceCharacters).toBe(5);
    expect(result.characterErrorRate).toBe(0.2);
  });
  it("counts failed and omitted pages as lost text rather than dropping them", () => {
    const result = evaluateOcrDocument(["ABC", "DEF"], ["ABC"]);
    expect(result.errors).toBe(3);
    expect(result.pageCoverage).toBe(0.5);
  });
  it("penalizes reversed lines even when their individual text is present", () => {
    expect(
      evaluateOcrDocument(["FIRST\nSECOND"], ["SECOND\nFIRST"])
        .orderedLineAgreement,
    ).toBe(0.5);
  });
  it("reports blank truth as not applicable, not perfect transcription", () => {
    expect(evaluateOcrDocument([""], [""]).characterErrorRate).toBeNull();
    expect(evaluateOcrDocument([""], [""]).pageCoverage).toBeNull();
  });
  it("includes failures in CER and latency, never reports unknown compute as free", () => {
    const result = summarizeOcrSegment(
      [
        {
          family: "a",
          wallMs: 10,
          status: "review_required",
          metrics: evaluateOcrDocument(["ABC"], ["ABC"]),
        },
        {
          family: "b",
          wallMs: 100,
          status: "failed",
          metrics: evaluateOcrDocument(["ABC"], []),
        },
      ],
      0.01,
    );
    expect(result.characterErrorRate).toBe(0.5);
    expect(result.screeningGate).toBe("not_passed");
    expect(result.latencyMs.p95).toBe(100);
    expect(result.failureRate).toBe(0.5);
    expect(result.computeCost).toEqual({
      value: null,
      reason: "host_rate_unavailable",
    });
    expect(result.confidenceInterval95).toHaveLength(2);
  });
  it("does not bootstrap rotated duplicates as independent documents", () => {
    const row = {
      family: "same",
      wallMs: 10,
      status: "review_required",
      metrics: evaluateOcrDocument(["ABC"], ["ABC"]),
    };
    const result = summarizeOcrSegment([row, row], 0.01);
    expect(result.confidenceInterval95).toBeNull();
    expect(result.intervalReason).toBe(
      "fewer_than_two_independent_source_families",
    );
    expect(result.representativeValidity).toBe("not_evaluated");
  });
  it("reports coverage and ordering with failed documents in their denominators", () => {
    const result = summarizeOcrSegment(
      [
        {
          family: "a",
          wallMs: 1,
          status: "review_required",
          metrics: evaluateOcrDocument(["ABC"], ["ABC"]),
        },
        {
          family: "b",
          wallMs: 2,
          status: "failed",
          metrics: evaluateOcrDocument(["ABC"], []),
        },
      ],
      0.01,
    );
    expect(result.macroPageAvailability).toBe(0.5);
    expect(result.macroOrderedLineAgreement).toBe(0.5);
  });
  it("reproduces a whole-family bootstrap using the recorded fixed seed", () => {
    const rows = ["a", "b", "c"].map((family, index) => ({
      family,
      wallMs: index,
      status: "review_required",
      metrics: evaluateOcrDocument(["ABC"], [index ? "ABC" : "ABX"]),
    }));
    expect(summarizeOcrSegment(rows, 0.01)).toEqual(
      summarizeOcrSegment(rows, 0.01),
    );
  });
});
