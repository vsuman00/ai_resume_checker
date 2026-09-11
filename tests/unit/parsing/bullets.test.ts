import { describe, expect, it } from "vitest";
import {
  countBullets,
  isBulletLine,
} from "../../../app/lib/server/parsing/bullets";

describe("bullet parser", () => {
  it.each(["• Result", "‣ Result", "➤ Result", "— Result", "1) Result"])(
    "recognizes Unicode and numbered bullet %s",
    (line) => {
      expect(isBulletLine(line)).toBe(true);
    },
  );

  it.each(["2021 - 2024", "React, TypeScript", "Software Engineer"])(
    "rejects non-bullet line %s",
    (line) => {
      expect(isBulletLine(line)).toBe(false);
    },
  );

  it("counts only bullet-prefixed lines", () => {
    expect(countBullets(["• One", "Text", "(2) Two", "➢ Three"])).toBe(3);
  });
});
