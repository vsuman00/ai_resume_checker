import { describe, expect, it } from "vitest";
import { scoreBand } from "../../app/lib/score-band";
import { atsRules } from "../../app/lib/server/atsRules";
import { parseSim } from "../../app/lib/server/parseSim";

describe("score semantics", () => {
  it.each([
    [0, "needs_work"],
    [39, "needs_work"],
    [40, "needs_work"],
    [49, "needs_work"],
    [50, "good_start"],
    [69, "good_start"],
    [70, "strong"],
    [71, "strong"],
    [100, "strong"],
  ] as const)("maps %i to %s", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });

  it("excludes the no-JD rule from the denominator", () => {
    const text =
      "Jane Doe\njane@example.com\nExperience\n2022 - Present\nSkills\nTypeScript";
    const parseView = parseSim({ text, totalPages: 1 });
    const result = atsRules({ text, jobDescription: "", parseView });
    const keywordRule = result.ruleTrace.find(
      (rule) => rule.ruleId === "keywords.coverage",
    );
    expect(keywordRule).toMatchObject({
      outcome: "not_evaluated",
      confidence: "none",
    });
    expect(result.score).toBeLessThan(100);
  });
});
