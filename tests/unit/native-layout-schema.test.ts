import { describe, expect, it } from "vitest";
import {
  NativeLayoutSchema,
  layoutTextGroups,
} from "../../app/lib/native-layout-schema";
import { normalizeNativePageLayout } from "../../app/lib/server/native-layout";

function fixture() {
  return {
    schemaVersion: "native-layout-v1" as const,
    pages: [
      normalizeNativePageLayout(
        1,
        {
          width: 600,
          height: 800,
          rotation: 0,
          convertToViewportPoint: (x, y) => [x, 800 - y],
        },
        [
          {
            str: "😀 Notes email",
            transform: [12, 0, 0, 12, 60, 720],
            width: 120,
            height: 12,
            dir: "ltr",
            hasEOL: true,
            fontName: "font",
          },
        ],
        {},
      ),
    ],
  };
}
describe("native layout read contract", () => {
  it("grounds every Unicode word and line in page text and source runs", () => {
    const layout = NativeLayoutSchema.parse(fixture());
    const line = layoutTextGroups(layout.pages[0])[0];
    expect(line.runIds).toEqual(["page-1-run-1"]);
    expect(line.words.map((word) => [word.text, word.start, word.end])).toEqual(
      [
        ["😀", 0, 1],
        ["Notes", 2, 7],
        ["email", 8, 13],
      ],
    );
    expect(line.text).toBe(
      Array.from(layout.pages[0].text).slice(line.start, line.end).join(""),
    );
  });
  it.each(["text", "start", "id", "box", "state"])(
    "rejects fabricated %s",
    (field) => {
      const layout = fixture();
      const run = layout.pages[0].blocks[0];
      if (field === "text") run.text = "fabricated";
      if (field === "start") run.start = 2;
      if (field === "id") run.id = "page-2-run-1";
      if (field === "box") run.box = null;
      if (field === "state") layout.pages[0].state = "review_required";
      expect(NativeLayoutSchema.safeParse(layout).success).toBe(false);
    },
  );
});
