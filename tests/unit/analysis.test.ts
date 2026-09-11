import { describe, expect, it } from "vitest";
import { atsRules } from "../../app/lib/server/atsRules";
import { parseSim } from "../../app/lib/server/parseSim";
import { FeedbackSchema, ParseViewSchema } from "../../app/lib/server/schema";

describe("analysis domain contracts", () => {
  const text = `Jane Doe\njane@example.com\n\nSummary\nFrontend engineer\n\nExperience\nFrontend Engineer\n2022 - Present\n\nSkills\nReact, TypeScript`;
  const jobDescription = "Frontend engineer React TypeScript";

  it("parses contact and sections deterministically", () => {
    const result = parseSim({ text, totalPages: 1 });
    expect(result.contact.name).toBe("Jane Doe");
    expect(result.contact.email).toBe("jane@example.com");
    expect(result.sections.map((section) => section.type)).toContain("skills");
    expect(ParseViewSchema.safeParse(result).success).toBe(true);
  });

  it("produces a reproducible rule trace", () => {
    const parseView = parseSim({ text, totalPages: 1 });
    const first = atsRules({ text, jobDescription, parseView });
    const second = atsRules({ text, jobDescription, parseView });
    expect(first).toEqual(second);
    expect(first.ruleTrace.length).toBe(9);
  });

  it("keeps the feedback schema bounded", () => {
    const category = {
      score: 80,
      tips: [
        {
          type: "good" as const,
          tip: "Clear evidence.",
          explanation: "Specific and grounded.",
        },
        {
          type: "improve" as const,
          tip: "Add detail.",
          explanation: "The result needs more context.",
        },
        {
          type: "good" as const,
          tip: "Readable structure.",
          explanation: "Sections are clear.",
        },
      ],
    };
    const result = FeedbackSchema.safeParse({
      overallScore: 80,
      ATS: {
        score: 80,
        tips: [
          { type: "good", tip: "Clear." },
          { type: "good", tip: "Relevant." },
          { type: "improve", tip: "Add detail." },
        ],
      },
      toneAndStyle: category,
      content: category,
      structure: category,
      skills: category,
    });
    expect(result.success).toBe(true);
  });
});
