import { describe, expect, it } from "vitest";
import {
  detectSectionType,
  parseSections,
} from "../../../app/lib/server/parsing/sections";
import { parsingFixtures } from "./fixtures";

describe("section parser", () => {
  it.each(
    parsingFixtures.filter(
      (fixture) => fixture.id !== "uk-two-column-reading-order-risk",
    ),
  )("matches section labels for $id", (fixture) => {
    expect(
      parseSections(fixture.text.split(/\r?\n/u)).map(
        (section) => section.type,
      ),
    ).toEqual(fixture.expected.sections);
  });

  it("normalizes accents, case, and localized aliases", () => {
    expect(detectSectionType("EXPÉRIENCE PROFESSIONNELLE")).toBe("experience");
    expect(detectSectionType("Formación académica:")).toBe("education");
    expect(detectSectionType("Compétences techniques")).toBe("skills");
  });

  it("does not claim to recover side-by-side column headers", () => {
    const fixture = parsingFixtures.find(
      (item) => item.id === "uk-two-column-reading-order-risk",
    );
    expect(fixture).toBeDefined();
    expect(
      parseSections(fixture!.text.split(/\r?\n/u)).map(
        (section) => section.type,
      ),
    ).toEqual(["education"]);
  });
});
