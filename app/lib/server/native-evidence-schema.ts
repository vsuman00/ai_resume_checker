import { z } from "zod";

const offset = z.number().int().nonnegative().max(500_000);
const reference = z.strictObject({
  spanId: z.string().min(1).max(100),
  start: offset,
  end: offset,
});

// This validates the retained native v1 source format, not calibrated v2 truth.
export const NativeEvidenceSchema = z
  .strictObject({
    schemaVersion: z.literal("native-evidence-v1"),
    extractorVersion: z.literal("unpdf-v1"),
    offsetUnit: z.literal("unicode_code_point"),
    pages: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(100),
          pageNumber: z.number().int().positive().max(20),
          text: z.string().max(500_000),
          method: z.literal("native_text"),
          confidence: z.literal("uncalibrated"),
        }),
      )
      .min(1)
      .max(20),
    spans: z
      .array(
        z.strictObject({
          id: z.string().min(1).max(100),
          pageId: z.string().min(1).max(100),
          start: offset,
          end: offset,
          text: z.string().max(500_000),
        }),
      )
      .min(1)
      .max(500_001),
    assertions: z
      .array(
        z.strictObject({
          field: z.enum(["name", "email", "phone"]),
          value: z.string().min(1).max(500_000).nullable(),
          state: z.enum(["review_required", "not_evaluated"]),
          confidence: z.literal("uncalibrated"),
          evidence: reference.nullable(),
        }),
      )
      .length(3),
  })
  .superRefine((graph, context) => {
    let valid =
      graph.pages.reduce((sum, page) => sum + page.text.length, 0) +
        (graph.pages.length - 1) * 2 <=
      500_000;
    let spanIndex = 0;
    for (const [pageIndex, page] of graph.pages.entries()) {
      valid &&=
        page.pageNumber === pageIndex + 1 &&
        page.id === `page-${pageIndex + 1}`;
      let cursor = 0;
      for (const [lineIndex, text] of page.text.split("\n").entries()) {
        const span = graph.spans[spanIndex++];
        const end = cursor + Array.from(text).length;
        valid &&=
          !!span &&
          span.id === `${page.id}-line-${lineIndex + 1}` &&
          span.pageId === page.id &&
          span.start === cursor &&
          span.end === end &&
          span.text === text;
        cursor = end + 1;
      }
    }
    valid &&=
      spanIndex === graph.spans.length &&
      new Set(graph.assertions.map((item) => item.field)).size === 3;
    const spans = new Map(graph.spans.map((span) => [span.id, span]));
    for (const assertion of graph.assertions) {
      if (assertion.state === "not_evaluated") {
        valid &&= assertion.value === null && assertion.evidence === null;
      } else {
        const source =
          assertion.evidence && spans.get(assertion.evidence.spanId);
        const chars = source ? Array.from(source.text) : [];
        valid &&=
          assertion.value !== null &&
          !!assertion.evidence &&
          !!source &&
          assertion.evidence.end > assertion.evidence.start &&
          assertion.evidence.end <= chars.length &&
          chars
            .slice(assertion.evidence.start, assertion.evidence.end)
            .join("") === assertion.value;
      }
    }
    if (!valid)
      context.addIssue({
        code: "custom",
        message: "Native evidence is not grounded in its immutable source",
      });
  });

export type NativeEvidence = z.infer<typeof NativeEvidenceSchema>;
