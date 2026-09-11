import { describe, expect, it } from "vitest";
import { extractDateStrings } from "../../../app/lib/server/parsing/dates";

describe("date parser", () => {
  it.each([
    ["Mar 2021 – Present", ["Mar 2021 – Present"]],
    ["février 2020 à aujourd’hui", ["février 2020 à aujourd’hui"]],
    ["März 2019 bis Dezember 2023", ["März 2019 bis Dezember 2023"]],
    ["03/2020 - 08/2024", ["03/2020 - 08/2024"]],
    ["2020/03 to 2024/08", ["2020/03 to 2024/08"]],
  ])("extracts %s", (text, expected) => {
    expect(extractDateStrings(text as string)).toEqual(expected);
  });

  it("deduplicates repeated raw date evidence", () => {
    expect(extractDateStrings("2021 - 2024\n2021 - 2024")).toEqual([
      "2021 - 2024",
    ]);
  });
});
