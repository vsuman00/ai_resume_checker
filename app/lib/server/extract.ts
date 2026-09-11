// PDF text extraction (all pages) via unpdf. Isolated from analyze.ts so it
// can be imported by self-checks under raw Node (no extensionless imports,
// no OpenAI/prompt deps). analyze.ts re-exports it.
import { getDocumentProxy, extractText } from "unpdf";

// pdfjs rejects Node Buffers ("Please provide binary data as Uint8Array"),
// and Buffer is an instanceof Uint8Array, so we can't shortcut on that.
// Always copy into a plain Uint8Array — cheap and bulletproof.
function toUint8Array(pdf: Buffer | Uint8Array): Uint8Array {
  const view = pdf as Uint8Array;
  const copy = new Uint8Array(view.byteLength);
  copy.set(view);
  return copy;
}

export type ResumeExtractionErrorCode =
  "INVALID_PDF" | "PAGE_LIMIT" | "EMPTY_TEXT" | "TEXT_LIMIT";

export class ResumeExtractionError extends Error {
  readonly code: ResumeExtractionErrorCode;

  constructor(code: ResumeExtractionErrorCode) {
    super(code);
    this.name = "ResumeExtractionError";
    this.code = code;
  }
}

export async function extractResumeText(
  pdf: Buffer | Uint8Array,
  limits: { maxPages?: number; maxCharacters?: number } = {},
): Promise<{ totalPages: number; text: string; pageTexts?: string[] }> {
  const bytes = toUint8Array(pdf);
  let doc;
  try {
    doc = await getDocumentProxy(bytes);
  } catch {
    throw new ResumeExtractionError("INVALID_PDF");
  }

  if (limits.maxPages !== undefined && doc.numPages > limits.maxPages) {
    throw new ResumeExtractionError("PAGE_LIMIT");
  }

  let extracted;
  try {
    extracted = await extractText(doc, { mergePages: false });
  } catch {
    throw new ResumeExtractionError("INVALID_PDF");
  }

  const pageTexts = Array.isArray(extracted.text)
    ? extracted.text
    : [extracted.text];
  const text = pageTexts.join("\n\n");
  if (text.trim().length === 0) {
    throw new ResumeExtractionError("EMPTY_TEXT");
  }
  if (
    limits.maxCharacters !== undefined &&
    text.length > limits.maxCharacters
  ) {
    throw new ResumeExtractionError("TEXT_LIMIT");
  }

  return { totalPages: extracted.totalPages, text, pageTexts };
}
