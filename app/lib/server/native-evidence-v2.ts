import { z } from "zod";
import { NativeLayoutSchema, type NativeLayout } from "../native-layout-schema";
import {
  NativeEvidenceSchema,
  type NativeEvidence,
} from "./native-evidence-schema";

const ContextSchema = z.strictObject({
  id: z.uuid(),
  ownerId: z.uuid(),
  analysisId: z.uuid(),
  sourceId: z.uuid(),
  inputSha256: z.string().regex(/^[a-f0-9]{64}$/),
  createdAt: z.iso.datetime(),
  retentionPolicyId: z.string().min(1).max(100),
});
export type NativeEvidenceV2Context = z.infer<typeof ContextSchema>;

function containsUnknownKeys(input: unknown, parsed: unknown): boolean {
  if (
    !input ||
    !parsed ||
    typeof input !== "object" ||
    typeof parsed !== "object"
  )
    return false;
  const keys = Object.keys(input);
  const parsedKeys = Object.keys(parsed);
  return (
    keys.some((key) => !parsedKeys.includes(key)) ||
    keys.some((key) =>
      containsUnknownKeys(
        (input as Record<string, unknown>)[key],
        (parsed as Record<string, unknown>)[key],
      ),
    )
  );
}

const StrictLayoutSchema = z.unknown().transform((input, context) => {
  const result = NativeLayoutSchema.safeParse(input);
  if (!result.success || containsUnknownKeys(input, result.data)) {
    context.addIssue({
      code: "custom",
      message: "Invalid native layout source contract",
    });
    return z.NEVER;
  }
  return result.data;
});
const unknownMeasurement = z.strictObject({
  value: z.null(),
  reason: z.literal("not_measured"),
});
const unknownBox = z.strictObject({
  value: z.null(),
  reason: z.literal("line_geometry_not_measured"),
});
const dimensions = z.strictObject({
  value: z
    .strictObject({
      width: z.number().finite().positive().max(100_000),
      height: z.number().finite().positive().max(100_000),
      unit: z.literal("pdf_point"),
      rotation: z.number().int().min(0).max(359),
    })
    .nullable(),
  reason: z.enum(["layout_unavailable", "native_page_dimensions"]),
});

function project(
  context: NativeEvidenceV2Context,
  native: NativeEvidence,
  layout: NativeLayout | null,
) {
  return {
    ...context,
    schemaVersion: "2.0.0" as const,
    producerVersion: "native-v2-adapter/1.0.0" as const,
    extractionPolicyId: "native-v2-unvalidated/1.0.0" as const,
    source: {
      type: "application/pdf" as const,
      nativeEvidence: native,
      nativeLayout: layout,
    },
    offsetUnit: "unicode_code_point" as const,
    coordinateSystem: "normalized_top_left" as const,
    status: native.pages.some((page) => page.text.trim().length)
      ? ("review_required" as const)
      : ("insufficient" as const),
    scoringEligible: false as const,
    calibration: { value: null, reason: "not_calibrated" as const },
    warnings: native.pages.some((page) => page.text.trim().length)
      ? ["uncalibrated_native_evidence" as const]
      : ["uncalibrated_native_evidence" as const, "no_native_text" as const],
    pages: native.pages.map((page, index) => {
      const geometry = layout?.pages[index];
      return {
        ...page,
        dimensions: geometry
          ? {
              value: {
                width: geometry.width,
                height: geometry.height,
                unit: "pdf_point" as const,
                rotation: geometry.rotation,
              },
              reason: "native_page_dimensions" as const,
            }
          : { value: null, reason: "layout_unavailable" as const },
        coverage: { value: null, reason: "not_measured" as const },
      };
    }),
    spans: native.spans.map((span) => ({
      ...span,
      box: { value: null, reason: "line_geometry_not_measured" as const },
    })),
    assertions: native.assertions.map((assertion) => ({
      field: assertion.field,
      value: assertion.value,
      state: assertion.state,
      evidence: assertion.evidence,
      confirmation: null,
      confidence: {
        kind: "uncalibrated" as const,
        value: null,
        reason: "not_calibrated" as const,
      },
      warnings:
        assertion.state === "not_evaluated"
          ? ["field_not_evaluated" as const]
          : ["candidate_review_required" as const],
    })),
  };
}

const V2Shape = ContextSchema.extend({
  schemaVersion: z.literal("2.0.0"),
  producerVersion: z.literal("native-v2-adapter/1.0.0"),
  extractionPolicyId: z.literal("native-v2-unvalidated/1.0.0"),
  source: z.strictObject({
    type: z.literal("application/pdf"),
    nativeEvidence: NativeEvidenceSchema,
    nativeLayout: StrictLayoutSchema.nullable(),
  }),
  offsetUnit: z.literal("unicode_code_point"),
  coordinateSystem: z.literal("normalized_top_left"),
  status: z.enum(["review_required", "insufficient"]),
  scoringEligible: z.literal(false),
  calibration: z.strictObject({
    value: z.null(),
    reason: z.literal("not_calibrated"),
  }),
  warnings: z
    .array(z.enum(["uncalibrated_native_evidence", "no_native_text"]))
    .min(1)
    .max(2),
  pages: z
    .array(
      NativeEvidenceSchema.shape.pages.element.extend({
        dimensions,
        coverage: unknownMeasurement,
      }),
    )
    .min(1)
    .max(20),
  spans: z
    .array(NativeEvidenceSchema.shape.spans.element.extend({ box: unknownBox }))
    .min(1)
    .max(500_001),
  assertions: z
    .array(
      z.strictObject({
        field: z.enum(["name", "email", "phone"]),
        value: z.string().min(1).max(500_000).nullable(),
        state: z.enum(["review_required", "not_evaluated"]),
        evidence: NativeEvidenceSchema.shape.assertions.element.shape.evidence,
        confirmation: z.null(),
        confidence: z.strictObject({
          kind: z.literal("uncalibrated"),
          value: z.null(),
          reason: z.literal("not_calibrated"),
        }),
        warnings: z
          .array(z.enum(["field_not_evaluated", "candidate_review_required"]))
          .length(1),
      }),
    )
    .length(3),
});

export const NativeEvidenceV2Schema = V2Shape.superRefine((value, context) => {
  const native = value.source.nativeEvidence;
  const layout = value.source.nativeLayout;
  const aligned =
    !layout ||
    (layout.pages.length === native.pages.length &&
      layout.pages.every(
        (page, index) =>
          page.pageId === native.pages[index].id &&
          page.text === native.pages[index].text,
      ));
  const expected = project(
    ContextSchema.parse({
      id: value.id,
      ownerId: value.ownerId,
      analysisId: value.analysisId,
      sourceId: value.sourceId,
      inputSha256: value.inputSha256,
      createdAt: value.createdAt,
      retentionPolicyId: value.retentionPolicyId,
    }),
    native,
    layout,
  );
  // Parsing through the same shape canonicalizes field order, not source text.
  if (
    !aligned ||
    JSON.stringify(value) !== JSON.stringify(V2Shape.parse(expected))
  ) {
    context.addIssue({
      code: "custom",
      message: "Native v2 projection contradicts immutable source evidence",
    });
  }
});
export type NativeEvidenceV2 = z.infer<typeof NativeEvidenceV2Schema>;

/** Pure adapter only. Trusted callers must authorize ownership and verify the
 * source byte hash before supplying server context; this function does no I/O.
 * No current persistence, worker or route consumes this experimental envelope.
 */
export function adaptNativeEvidenceV2(
  serverContext: unknown,
  nativeSource: unknown,
  layoutSource?: unknown,
): NativeEvidenceV2 {
  const context = ContextSchema.parse(serverContext);
  const native = NativeEvidenceSchema.parse(nativeSource);
  const layout =
    layoutSource === undefined || layoutSource === null
      ? null
      : StrictLayoutSchema.parse(layoutSource);
  return NativeEvidenceV2Schema.parse(project(context, native, layout));
}
