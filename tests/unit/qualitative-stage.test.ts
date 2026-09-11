import { describe, expect, it } from "vitest";
import { FeedbackSchema } from "../../app/lib/server/schema";
import { buildPartialFeedback } from "../../app/lib/server/qualitative-stage";

describe("partial qualitative result", () => {
  it("keeps the deterministic ATS score while clearly marking qualitative feedback unavailable", () => {
    const feedback = buildPartialFeedback({
      score: 74,
      ruleTrace: [
        { passed: true, detail: "Email address was found." },
        { passed: false, detail: "Add a Skills section." },
        { passed: true, detail: "Dates are parseable." },
      ],
    });

    expect(FeedbackSchema.parse(feedback)).toEqual(feedback);
    expect(feedback.overallScore).toBe(74);
    expect(feedback.ATS.score).toBe(74);
    expect(feedback.content.tips[0].tip).toMatch(/unavailable/i);
  });
});
