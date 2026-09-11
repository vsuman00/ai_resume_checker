import corpus from "../../fixtures/parsing/t051-labeled.json";

export type WarningLabel = "multi-column" | "reading-order";

export interface ParsingFixture {
  id: string;
  text: string;
  expected: {
    contact: {
      name: string | null;
      email: string | null;
      phone: string | null;
      location: string | null;
      links: string[];
    };
    sections: ParseViewSection["type"][];
    warnings: WarningLabel[];
  };
}

export const parsingFixtures = corpus.fixtures as ParsingFixture[];

export function warningLabels(
  warnings: readonly ParseViewWarning[],
): WarningLabel[] {
  const labels: WarningLabel[] = [];
  if (
    warnings.some((warning) =>
      warning.message.startsWith("Possible multi-column layout"),
    )
  ) {
    labels.push("multi-column");
  }
  if (
    warnings.some((warning) =>
      warning.message.startsWith("Possible reading-order anomaly"),
    )
  ) {
    labels.push("reading-order");
  }
  return labels;
}
