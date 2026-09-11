import { lineHasContactSignal } from "./contact";
import { detectSectionType, type DetectedSection } from "./sections";

const MULTI_COLUMN_MESSAGE =
  "Possible multi-column layout detected from repeated tab or wide-gap alignment; extracted reading order may be unreliable.";
const READING_ORDER_MESSAGE =
  "Possible reading-order anomaly detected: contact details or repeated/interleaved section headers appear after content begins.";

export function parseLayoutWarnings(args: {
  lines: readonly string[];
  sections: readonly DetectedSection[];
}): ParseViewWarning[] {
  const warnings: ParseViewWarning[] = [];
  const splitLines = args.lines.map(splitColumns);
  const alignedColumnLines = splitLines.filter(
    (parts) => parts.length >= 2 && parts.every((part) => part.length >= 2),
  );
  const sideBySideHeaders = splitLines.some(
    (parts) => parts.filter((part) => detectSectionType(part)).length >= 2,
  );

  if (alignedColumnLines.length >= 2 || sideBySideHeaders) {
    warnings.push({
      field: "overall",
      severity: "warn",
      message: MULTI_COLUMN_MESSAGE,
    });
  }

  const firstSectionLine = args.sections[0]?.startLine;
  const contactAfterContent =
    firstSectionLine !== undefined &&
    args.lines.some(
      (line, index) =>
        index > firstSectionLine &&
        index < Math.max(12, Math.ceil(args.lines.length / 3)) &&
        lineHasContactSignal(line),
    );
  const repeatedSection = hasRepeatedSectionType(args.sections);

  if (contactAfterContent || repeatedSection || sideBySideHeaders) {
    warnings.push({
      field: "overall",
      severity: "warn",
      message: READING_ORDER_MESSAGE,
    });
  }

  return warnings;
}

function splitColumns(line: string): string[] {
  return line
    .trim()
    .split(/\t+| {3,}/u)
    .map((part) => part.trim())
    .filter(Boolean);
}

function hasRepeatedSectionType(sections: readonly DetectedSection[]): boolean {
  const seen = new Set<ParseViewSection["type"]>();
  for (const section of sections) {
    if (seen.has(section.type)) return true;
    seen.add(section.type);
  }
  return false;
}
