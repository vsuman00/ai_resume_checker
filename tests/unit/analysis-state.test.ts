import { describe, expect, it } from "vitest";
import {
  AnalysisStatuses,
  canTransitionAnalysis,
} from "../../app/lib/server/analysis-state";

describe("analysis state policy", () => {
  it("allows exactly the architecture state graph transitions", () => {
    const allowed = new Set([
      "created:uploading",
      "created:cancelled",
      "uploading:quarantined",
      "uploading:cancelled",
      "quarantined:queued",
      "quarantined:rejected",
      "quarantined:failed",
      "queued:extracting",
      "queued:cancelled",
      "queued:failed",
      "extracting:scoring",
      "extracting:needs_ocr",
      "extracting:failed",
      "needs_ocr:scoring",
      "needs_ocr:failed",
      "scoring:qualitative_review",
      "scoring:failed",
      "qualitative_review:completed",
      "qualitative_review:partial",
      "qualitative_review:failed",
    ]);

    for (const current of AnalysisStatuses) {
      for (const next of AnalysisStatuses) {
        expect(canTransitionAnalysis(current, next)).toBe(
          allowed.has(`${current}:${next}`),
        );
      }
    }
  });
});
