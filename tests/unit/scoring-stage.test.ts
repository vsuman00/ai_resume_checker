import { describe, expect, it } from "vitest";
import {
  NORMALIZER_VERSION,
  PARSER_VERSION,
  RULESET_VERSION,
  scoreExtractedResume,
} from "../../app/lib/server/scoring-stage";
import { TAXONOMY_VERSION } from "../../app/lib/server/matching";

const fixture = {
  text: `Jane Doe
jane@example.com

Summary
Frontend engineer building accessible web applications.

Experience
Frontend Engineer
2022 - Present
• Built React and TypeScript applications for customers.

Education
B.S. Computer Science

Skills
React, TypeScript, Node.js`,
  pageCount: 1,
  jobDescription: "Frontend engineer with React and TypeScript experience",
  textChecksum: "a".repeat(64),
};

describe("deterministic scoring stage", () => {
  it("produces versioned rule evidence", () => {
    const result = scoreExtractedResume(fixture);
    expect(result.parserVersion).toBe(PARSER_VERSION);
    expect(result.rulesetVersion).toBe(RULESET_VERSION);
    expect(result.normalizerVersion).toBe(NORMALIZER_VERSION);
    expect(result.taxonomyVersion).toBe(TAXONOMY_VERSION);
    expect(result.keywordCoverage).toMatchObject({
      taxonomyVersion: TAXONOMY_VERSION,
      job: ["frontend", "React", "TypeScript"],
      matched: ["frontend", "React", "TypeScript"],
    });
    expect(result.keywordCoverage.evidence).toHaveLength(3);
    expect(result.ruleTrace).toHaveLength(9);
    expect(result.resultChecksum).toHaveLength(64);
  });

  it("is reproducible for identical versioned input", () => {
    expect(scoreExtractedResume(fixture)).toEqual(
      scoreExtractedResume(fixture),
    );
  });

  it("changes evidence when the input changes", () => {
    const first = scoreExtractedResume(fixture);
    const second = scoreExtractedResume({
      ...fixture,
      text: `${fixture.text}\nPostgreSQL`,
      textChecksum: "b".repeat(64),
    });
    expect(second.resultChecksum).not.toBe(first.resultChecksum);
  });
});
