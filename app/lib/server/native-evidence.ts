import { parseContact } from "./parsing/contact";
import { NativeEvidenceSchema } from "./native-evidence-schema";

// Offsets count Unicode code points, matching PostgreSQL substring semantics.
// Native text presence is provenance, not calibrated extraction confidence.
export function buildNativeEvidence(pageTexts: readonly string[]) {
  const pages = pageTexts.map((text, index) => ({
    id: `page-${index + 1}`,
    pageNumber: index + 1,
    text,
    method: "native_text" as const,
    confidence: "uncalibrated" as const,
  }));
  const spans = pages.flatMap((page) => {
    let offset = 0;
    return page.text.split("\n").map((text, index) => {
      const span = {
        id: `${page.id}-line-${index + 1}`,
        pageId: page.id,
        start: offset,
        end: offset + Array.from(text).length,
        text,
      };
      offset = span.end + 1;
      return span;
    });
  });
  const contact = parseContact(spans.map((span) => span.text));
  const assertions = (["name", "email", "phone"] as const).map((field) => {
    const value = contact[field];
    const span = value
      ? spans.find((candidate) => candidate.text.includes(value))
      : undefined;
    const index = span && value ? span.text.indexOf(value) : -1;
    return {
      field,
      value: span ? value : null,
      state: span ? "review_required" : "not_evaluated",
      confidence: "uncalibrated",
      evidence:
        span && value
          ? {
              spanId: span.id,
              start: Array.from(span.text.slice(0, index)).length,
              end: Array.from(span.text.slice(0, index + value.length)).length,
            }
          : null,
    };
  });
  return NativeEvidenceSchema.parse({
    schemaVersion: "native-evidence-v1",
    extractorVersion: "unpdf-v1",
    offsetUnit: "unicode_code_point",
    pages,
    spans,
    assertions,
  });
}
