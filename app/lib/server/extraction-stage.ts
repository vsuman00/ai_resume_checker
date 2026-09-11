import { createHash, randomUUID } from "node:crypto";
import { getAnalysisConfig } from "./config";
import {
  extractResumeText,
  ResumeExtractionError,
  type ResumeExtractionErrorCode,
} from "./extract";
import {
  DEFAULT_OCR_RUNTIME,
  resolveOcr,
  type OcrFailureReason,
  type OcrRuntime,
} from "./ocr/adapter";
import {
  detectPdfTextProfile,
  extractPdfTextLayers,
  type PdfTextExtraction,
} from "./ocr/pdf-detection";
import { createResumeStorage } from "./storage";
import { createSupabaseAdminClient } from "./supabase";

const EXTRACTOR_VERSION = "unpdf-v1";

type ResumeExtractor = typeof extractResumeText;
type PdfLayerExtractor = typeof extractPdfTextLayers;

export type ExtractionFailureCode =
  ResumeExtractionErrorCode | "OVERSIZED" | "TIMEOUT";

export class ExtractionStageFailure extends Error {
  readonly code: ExtractionFailureCode;

  constructor(code: ExtractionFailureCode) {
    super(code);
    this.name = "ExtractionStageFailure";
    this.code = code;
  }
}

export class OcrRequiredError extends Error {
  readonly reason: OcrFailureReason;

  constructor(reason: OcrFailureReason, warning: string) {
    super(warning);
    this.name = "OcrRequiredError";
    this.reason = reason;
  }
}

export function extractionFailureStatus(
  error: unknown,
): "needs_ocr" | "failed" | null {
  if (error instanceof ResumeExtractionError) {
    return error.code === "EMPTY_TEXT" ? "needs_ocr" : "failed";
  }
  if (error instanceof OcrRequiredError) return "needs_ocr";
  if (error instanceof ExtractionStageFailure) {
    return "failed";
  }
  return null;
}

export async function extractPdfForAnalysis(
  args: {
    bytes: Uint8Array;
    maxBytes: number;
    maxPages: number;
    maxCharacters: number;
    timeoutMs: number;
  },
  extractor: PdfLayerExtractor = extractPdfTextLayers,
  ocrRuntime: OcrRuntime = DEFAULT_OCR_RUNTIME,
) {
  if (args.bytes.byteLength > args.maxBytes) {
    throw new ExtractionStageFailure("OVERSIZED");
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const startedAt = performance.now();
  try {
    const extracted = await Promise.race([
      extractor(args.bytes, {
        maxPages: args.maxPages,
        maxCharacters: args.maxCharacters,
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new ExtractionStageFailure("TIMEOUT")),
          args.timeoutMs,
        );
        timeout.unref?.();
      }),
    ]);
    return resolveExtraction(extracted, args, ocrRuntime, startedAt);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function resolveExtraction(
  extracted: PdfTextExtraction,
  args: { bytes: Uint8Array; maxCharacters: number },
  ocrRuntime: OcrRuntime,
  startedAt: number,
) {
  const profile = detectPdfTextProfile(extracted);
  let text = extracted.text;
  let pageTexts = extracted.pageTexts;
  let extractorVersion = EXTRACTOR_VERSION;
  const warnings: string[] = [];

  if (profile.documentType !== "text") {
    const ocr = await resolveOcr(
      { bytes: args.bytes, pageCount: extracted.totalPages },
      ocrRuntime,
    );
    if (ocr.status === "needs_ocr") {
      throw new OcrRequiredError(
        ocr.reason,
        warningForOcrRequirement(profile.documentType, ocr.reason),
      );
    }
    text = ocr.text;
    pageTexts = ocr.pageTexts;
    extractorVersion = ocr.adapterVersion;
    warnings.push(
      profile.documentType === "scanned"
        ? "OCR was used because no usable PDF text layer was detected."
        : `OCR was used for PDF pages ${profile.pagesNeedingOcr.join(", ")}.`,
    );
  }
  if (text.length > args.maxCharacters) {
    throw new ResumeExtractionError("TEXT_LIMIT");
  }
  if (text.trim().length === 0) {
    throw new OcrRequiredError(
      "low_confidence",
      "The PDF text could not be read reliably; OCR is required before scoring.",
    );
  }

  return {
    totalPages: extracted.totalPages,
    text,
    pageTexts,
    textChecksum: createHash("sha256").update(text).digest("hex"),
    warnings,
    durationMs: Math.round(performance.now() - startedAt),
    extractorVersion,
  };
}

function warningForOcrRequirement(
  documentType: "scanned" | "mixed",
  reason: OcrFailureReason,
) {
  const type = documentType === "scanned" ? "scanned" : "mixed text-layer";
  if (reason === "unsupported") {
    return `This ${type} PDF cannot be scored because OCR is not approved for this workspace.`;
  }
  return `This ${type} PDF requires OCR before scoring (${reason.replaceAll("_", " ")}).`;
}

export async function extractBoundedInput(
  args: {
    bytes: Uint8Array;
    maxBytes: number;
    maxPages: number;
    maxCharacters: number;
    timeoutMs: number;
  },
  extractor: ResumeExtractor = extractResumeText,
) {
  if (args.bytes.byteLength > args.maxBytes) {
    throw new ExtractionStageFailure("OVERSIZED");
  }

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const startedAt = performance.now();
  try {
    const extracted = await Promise.race([
      extractor(args.bytes, {
        maxPages: args.maxPages,
        maxCharacters: args.maxCharacters,
      }),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new ExtractionStageFailure("TIMEOUT")),
          args.timeoutMs,
        );
        timeout.unref?.();
      }),
    ]);

    return {
      ...extracted,
      pageTexts: extracted.pageTexts ?? [extracted.text],
      textChecksum: createHash("sha256").update(extracted.text).digest("hex"),
      warnings: extracted.totalPages > 2 ? ["Resume exceeds two pages."] : [],
      durationMs: Math.round(performance.now() - startedAt),
      extractorVersion: EXTRACTOR_VERSION,
    };
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

async function transition(
  analysisId: string,
  expected: string,
  next: string,
  processId: string,
  requestId: string,
) {
  const { data, error } = await createSupabaseAdminClient().rpc(
    "transition_analysis",
    {
      p_analysis_id: analysisId,
      p_expected_status: expected,
      p_next_status: next,
      p_actor_id: null,
      p_process_id: processId,
      p_request_id: requestId,
    },
  );
  if (error || data !== true) throw new Error("Analysis transition failed.");
}

export async function processExtractionStage(
  analysisId: string,
): Promise<void> {
  const admin = createSupabaseAdminClient();
  const processId = `extractor-${randomUUID()}`;
  const requestId = `worker-${randomUUID()}`;
  const { data, error } = await admin
    .from("analyses")
    .select("status, resume_versions(storage_key, organization_id)")
    .eq("id", analysisId)
    .single();
  if (error || !data) throw new Error("Analysis input is unavailable.");

  if (data.status === "quarantined") {
    await transition(analysisId, "quarantined", "queued", processId, requestId);
  }
  if (data.status === "queued") {
    await transition(analysisId, "queued", "extracting", processId, requestId);
  }
  if (
    !(["quarantined", "queued", "extracting"] as const).includes(data.status)
  ) {
    return;
  }

  const version = Array.isArray(data.resume_versions)
    ? data.resume_versions[0]
    : data.resume_versions;
  if (!version) throw new Error("Resume version is unavailable.");

  try {
    const bytes = await createResumeStorage().download(version.storage_key);
    const config = getAnalysisConfig();
    const extracted = await extractPdfForAnalysis({
      bytes,
      maxBytes: config.MAX_UPLOAD_BYTES,
      maxPages: config.MAX_PDF_PAGES,
      maxCharacters: config.MAX_EXTRACTED_CHARACTERS,
      timeoutMs: config.EXTRACTION_TIMEOUT_MS,
    });
    const { data: persisted, error: persistError } = await admin.rpc(
      "persist_analysis_extraction",
      {
        p_analysis_id: analysisId,
        p_duration_ms: extracted.durationMs,
        p_extracted_text: extracted.text,
        p_extractor_version: extracted.extractorVersion,
        p_page_count: extracted.totalPages,
        p_page_texts: extracted.pageTexts,
        p_process_id: processId,
        p_request_id: requestId,
        p_text_checksum: extracted.textChecksum,
        p_warnings: extracted.warnings,
      },
    );
    if (persistError || persisted !== true) {
      throw new Error("Extraction persistence failed.");
    }
  } catch (caught) {
    const failureStatus = extractionFailureStatus(caught);
    if (failureStatus) {
      await transition(
        analysisId,
        "extracting",
        failureStatus,
        processId,
        requestId,
      );
      return;
    }
    throw caught;
  }
}
