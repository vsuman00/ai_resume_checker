import { describe, expect, it } from "vitest";
import { parseLayoutWarnings } from "../../../app/lib/server/parsing/layout";
import { parseSections } from "../../../app/lib/server/parsing/sections";
import { parsingFixtures, warningLabels } from "./fixtures";

describe("layout parser", () => {
  it.each(
    parsingFixtures.filter((fixture) => fixture.expected.warnings.length > 0),
  )("matches layout labels for $id", (fixture) => {
    const lines = fixture.text.split(/\r?\n/u);
    expect(
      warningLabels(
        parseLayoutWarnings({ lines, sections: parseSections(lines) }),
      ),
    ).toEqual(fixture.expected.warnings);
  });

  it.each(
    parsingFixtures.filter((fixture) => fixture.expected.warnings.length === 0),
  )("does not add layout warnings for $id", (fixture) => {
    const lines = fixture.text.split(/\r?\n/u);
    expect(
      parseLayoutWarnings({ lines, sections: parseSections(lines) }),
    ).toEqual([]);
  });
});
