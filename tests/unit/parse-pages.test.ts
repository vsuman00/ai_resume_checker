import { describe, expect, it } from "vitest";
import { parseSim } from "~/lib/server/parseSim";

describe("multi-page parse evidence", () => {
  it("preserves page text and reports confidence and limitations per page", () => {
    const result = parseSim({
      text: "Ada Lovelace\nada@example.com\n\nExperience\nBuilt systems",
      totalPages: 2,
      pageTexts: [
        "Ada Lovelace\nada@example.com\n\nExperience\nBuilt systems",
        "",
      ],
    });

    expect(result.pages).toHaveLength(2);
    expect(result.pages[0]).toMatchObject({
      pageNumber: 1,
      text: expect.stringContaining("Ada Lovelace"),
      confidence: "high",
    });
    expect(result.pages[1]).toMatchObject({
      pageNumber: 2,
      confidence: "low",
    });
    expect(result.pages[1].warnings).toContain(
      "No extractable text was found on this page.",
    );
  });

  it("keeps the selector bounded to a ten-page document", () => {
    const result = parseSim({
      text: Array.from({ length: 10 }, (_, index) => `Page ${index + 1}`).join(
        "\n",
      ),
      totalPages: 10,
      pageTexts: Array.from({ length: 10 }, (_, index) => `Page ${index + 1}`),
    });

    expect(result.pages.map((page) => page.pageNumber)).toEqual(
      Array.from({ length: 10 }, (_, index) => index + 1),
    );
  });
});
