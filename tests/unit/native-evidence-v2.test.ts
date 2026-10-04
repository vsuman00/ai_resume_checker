import { describe, expect, it } from "vitest";
import { buildNativeEvidence } from "../../app/lib/server/native-evidence";
import {
  adaptNativeEvidenceV2,
  NativeEvidenceV2Schema,
} from "../../app/lib/server/native-evidence-v2";

function context() {
  return {
    id: "10000000-0000-4000-8000-000000000001",
    ownerId: "10000000-0000-4000-8000-000000000002",
    analysisId: "10000000-0000-4000-8000-000000000003",
    sourceId: "10000000-0000-4000-8000-000000000004",
    inputSha256: "a".repeat(64),
    createdAt: "2026-10-04T12:00:00.000Z",
    retentionPolicyId: "synthetic-local-30d/1.0.0",
  };
}

function source() {
  return buildNativeEvidence(["Alex Example\n😀 résumé\nalex@example.test"]);
}

function layout() {
  const text = source().pages[0].text;
  return {
    schemaVersion: "native-layout-v1",
    pages: [
      {
        pageId: "page-1",
        pageNumber: 1,
        text,
        width: 612,
        height: 792,
        rotation: 0,
        coordinateSystem: "normalized_top_left",
        readingOrder: "pdf_source_order",
        state: "uncalibrated",
        warnings: [],
        blocks: [
          {
            id: "page-1-run-1",
            pageId: "page-1",
            text,
            start: 0,
            end: Array.from(text).length,
            sourceOrder: 0,
            box: { x: 0.1, y: 0.1, width: 0.8, height: 0.1 },
            geometry: "approximate_font_em",
          },
        ],
      },
    ],
  };
}

describe("pure native evidence v2 adapter", () => {
  it("binds server context without mutating or relabelling v1 provenance", () => {
    const native = source();
    const before = structuredClone(native);
    const result = adaptNativeEvidenceV2(context(), native);
    expect(result.schemaVersion).toBe("2.0.0");
    expect(result.ownerId).toBe(context().ownerId);
    expect(result.source.nativeEvidence).toEqual(before);
    expect(native).toEqual(before);
    expect(result.spans[1].text).toBe("😀 résumé");
    expect(result.spans[1].end - result.spans[1].start).toBe(8);
    result.source.nativeEvidence.pages[0].text = "changed copy";
    expect(native).toEqual(before);
  });

  it("never upgrades native confidence, unknown coverage or scoring eligibility", () => {
    const result = adaptNativeEvidenceV2(context(), source());
    expect(result.status).toBe("review_required");
    expect(result.scoringEligible).toBe(false);
    expect(result.calibration).toEqual({
      value: null,
      reason: "not_calibrated",
    });
    expect(result.pages[0].coverage).toEqual({
      value: null,
      reason: "not_measured",
    });
    expect(result.pages[0].dimensions.value).toBeNull();
    expect(
      result.assertions.every(
        (a) => a.confidence.kind === "uncalibrated" && a.confirmation === null,
      ),
    ).toBe(true);
    expect(result.spans.every((s) => s.box.value === null)).toBe(true);
  });

  it("keeps empty evidence insufficient, not successful or zero-scored", () => {
    const result = adaptNativeEvidenceV2(context(), buildNativeEvidence([""]));
    expect(result.status).toBe("insufficient");
    expect(result.warnings).toContain("no_native_text");
    expect(result.scoringEligible).toBe(false);
  });

  it("accepts explicit unavailable layout as null without creating geometry", () => {
    const result = adaptNativeEvidenceV2(context(), source(), null);
    expect(result.source.nativeLayout).toBeNull();
    expect(result.pages[0].dimensions).toEqual({
      value: null,
      reason: "layout_unavailable",
    });
  });

  it("retains optional approximate run geometry without inventing word or line boxes", () => {
    const original = layout();
    const result = adaptNativeEvidenceV2(context(), source(), original);
    expect(result.source.nativeLayout).toEqual(original);
    expect(result.pages[0].dimensions.value).toEqual({
      width: 612,
      height: 792,
      unit: "pdf_point",
      rotation: 0,
    });
    expect(result.spans[0].box.value).toBeNull();
    expect(result.status).toBe("review_required");
  });

  it.each([
    ["invalid owner", { ownerId: "someone" }],
    ["invalid hash", { inputSha256: "bad" }],
    ["non UTC timestamp", { createdAt: "2026-10-04T12:00:00+01:00" }],
    ["missing retention", { retentionPolicyId: "" }],
    ["client score", { score: 100 }],
  ])("rejects %s context", (_name, change) => {
    expect(() =>
      adaptNativeEvidenceV2({ ...context(), ...change }, source()),
    ).toThrow();
  });

  it("rejects malformed legacy spans and unsupported source versions", () => {
    const native = source();
    native.spans[0].end = Infinity;
    expect(() => adaptNativeEvidenceV2(context(), native)).toThrow();
    expect(() =>
      adaptNativeEvidenceV2(context(), {
        ...source(),
        schemaVersion: "native-evidence-v99",
      }),
    ).toThrow();
  });

  it("rejects layout from a different immutable text and unknown layout fields", () => {
    const other = layout();
    other.pages[0].text = "different";
    expect(() => adaptNativeEvidenceV2(context(), source(), other)).toThrow();
    expect(() =>
      adaptNativeEvidenceV2(context(), source(), {
        ...layout(),
        calibrated: true,
      }),
    ).toThrow();
  });

  it("rejects nested unknown layout metadata, missing pages and nonfinite dimensions", () => {
    const metadata = layout();
    Object.assign(metadata.pages[0].blocks[0], { calibratedConfidence: 1 });
    expect(() =>
      adaptNativeEvidenceV2(context(), source(), metadata),
    ).toThrow();
    const nonfinite = layout();
    nonfinite.pages[0].width = Infinity;
    expect(() =>
      adaptNativeEvidenceV2(context(), source(), nonfinite),
    ).toThrow();
    expect(() =>
      adaptNativeEvidenceV2(context(), source(), { ...layout(), pages: [] }),
    ).toThrow();
  });

  it("preserves warned out-of-page legacy geometry instead of upgrading its precision", () => {
    const warned = layout();
    Object.assign(warned.pages[0], {
      state: "review_required",
      warnings: ["out_of_page_geometry"],
    });
    warned.pages[0].blocks[0].box.x = -0.1;
    const result = adaptNativeEvidenceV2(context(), source(), warned);
    expect(result.source.nativeLayout?.pages[0].blocks[0].box?.x).toBe(-0.1);
    expect(result.spans[0].box.value).toBeNull();
    expect(result.scoringEligible).toBe(false);
  });

  it.each(["pending", "extracting", "ready", "unsupported", "failed"])(
    "rejects fabricated terminal or lifecycle state %s in this native-only slice",
    (status) => {
      const result = adaptNativeEvidenceV2(context(), source());
      expect(
        NativeEvidenceV2Schema.safeParse({ ...result, status }).success,
      ).toBe(false);
    },
  );

  it.each([
    "version",
    "score",
    "status",
    "text",
    "reference",
    "coverage",
    "calibration",
    "unknown",
  ])("rejects contradictory v2 %s", (change) => {
    const result = adaptNativeEvidenceV2(context(), source());
    if (change === "version") Object.assign(result, { schemaVersion: "3.0.0" });
    if (change === "score") Object.assign(result, { scoringEligible: true });
    if (change === "status") Object.assign(result, { status: "ready" });
    if (change === "text") result.spans[0].text = "invented";
    if (change === "reference") result.spans[0].pageId = "page-99";
    if (change === "coverage")
      Object.assign(result.pages[0].coverage, { value: 1 });
    if (change === "calibration")
      Object.assign(result.calibration, { value: "calibrated" });
    if (change === "unknown")
      Object.assign(result, { authoritativeScore: 100 });
    expect(NativeEvidenceV2Schema.safeParse(result).success).toBe(false);
  });
});
