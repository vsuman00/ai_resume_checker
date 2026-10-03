import { syntheticPdf } from "./native-pdf";

// Synthetic regression corpus v1. Coordinates and expected visual order are
// authored independently of inference; this is NOT the AA015 release corpus.
type Fixture = {
  id: string;
  segment: "single" | "multi" | "table" | "unsupported";
  points: [string, number, number][];
  expected: string[];
  rotation?: number;
};
export const readingOrderFixtures: Fixture[] = [
  {
    id: "single-reversed",
    segment: "single",
    points: [
      ["Third", 50, 650],
      ["Second", 50, 700],
      ["First", 50, 750],
    ],
    expected: ["First", "Second", "Third"],
  },
  {
    id: "single-indented",
    segment: "single",
    points: [
      ["Bullet", 65, 700],
      ["Heading", 50, 750],
      ["Details", 55, 650],
    ],
    expected: ["Heading", "Bullet", "Details"],
  },
  {
    id: "single-variable-spacing",
    segment: "single",
    points: [
      ["Last", 50, 500],
      ["Middle", 50, 731],
      ["Top", 50, 750],
    ],
    expected: ["Top", "Middle", "Last"],
  },
  {
    id: "single-right-aligned",
    segment: "single",
    points: [
      ["Short", 480, 650],
      ["Longer", 470, 700],
      ["WideTitle", 450, 750],
    ],
    expected: ["WideTitle", "Longer", "Short"],
  },
  {
    id: "multi-row-source",
    segment: "multi",
    points: [
      ["R1", 350, 750],
      ["L1", 50, 750],
      ["R2", 350, 720],
      ["L2", 50, 720],
    ],
    expected: ["L1", "L2", "R1", "R2"],
  },
  {
    id: "multi-staggered",
    segment: "multi",
    points: [
      ["R2", 360, 655],
      ["L2", 60, 670],
      ["R1", 360, 725],
      ["L1", 60, 750],
    ],
    expected: ["L1", "L2", "R1", "R2"],
  },
  {
    id: "multi-three",
    segment: "multi",
    points: [
      ["C2", 440, 650],
      ["B1", 250, 750],
      ["A2", 50, 670],
      ["C1", 440, 735],
      ["A1", 50, 750],
      ["B2", 250, 690],
    ],
    expected: ["A1", "A2", "B1", "B2", "C1", "C2"],
  },
  {
    id: "multi-spanning",
    segment: "multi",
    points: [
      ["R2", 350, 650],
      ["L1", 50, 710],
      [
        "A spanning resume heading with intentionally wide native text across the page",
        50,
        750,
      ],
      ["R1", 350, 700],
      ["L2", 50, 660],
    ],
    expected: [
      "A spanning resume heading with intentionally wide native text across the page",
      "L1",
      "L2",
      "R1",
      "R2",
    ],
  },
  {
    id: "table-aligned",
    segment: "table",
    points: [
      ["A", 50, 750],
      ["1", 350, 750],
      ["B", 50, 730],
      ["2", 350, 730],
      ["C", 50, 710],
      ["3", 350, 710],
    ],
    expected: ["A", "1", "B", "2", "C", "3"],
  },
  {
    id: "rotated",
    segment: "unsupported",
    points: [["Rotated", 50, 750]],
    expected: [],
    rotation: 90,
  },
  {
    id: "outside-crop",
    segment: "unsupported",
    points: [["Outside", -100, 750]],
    expected: [],
  },
];
export function readingOrderPdf(fixture: Fixture) {
  return syntheticPdf(
    fixture.points
      .map(
        ([text, x, y]) => `BT /F1 12 Tf 1 0 0 1 ${x} ${y} Tm (${text}) Tj ET`,
      )
      .join("\n"),
    fixture.rotation ?? 0,
  );
}
