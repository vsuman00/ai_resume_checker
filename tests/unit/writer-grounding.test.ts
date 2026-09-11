import { describe, expect, it } from "vitest";
import { groundWriterSuggestions } from "~/lib/server/writer-grounding";

describe("writer evidence grounding", () => {
  it("keeps suggestions whose source facts are present", () => {
    const result = groundWriterSuggestions(
      {
        summary: "Backend engineer who improved API latency by 40% at Acme.",
        bullets: [
          {
            original: "Improved API latency by 40% at Acme.",
            rewrite: "Reduced API latency by 40% at Acme.",
            reasoning: "Makes the measured outcome clearer.",
          },
        ],
      },
      "Jordan Doe\nBackend Engineer at Acme\nImproved API latency by 40% at Acme.",
    );

    expect(result.summary).toContain("40%");
    expect(result.bullets).toHaveLength(1);
  });

  it("removes invented facts and never creates suggestions from empty source", () => {
    const result = groundWriterSuggestions(
      {
        summary: "Won an award and led 12 engineers at Globex.",
        bullets: [
          {
            original: "Built a dashboard.",
            rewrite:
              "Built a dashboard with python that saved 90% of support time at Globex.",
            reasoning: "Adds impact.",
          },
        ],
      },
      "Jordan Doe\nBuilt a dashboard.",
    );

    expect(result.summary).toBeNull();
    expect(result.bullets).toEqual([]);
    expect(
      groundWriterSuggestions({ summary: "Anything", bullets: [] }, "   "),
    ).toEqual({ summary: null, bullets: [] });
  });
});
