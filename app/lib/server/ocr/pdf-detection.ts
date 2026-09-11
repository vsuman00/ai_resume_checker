import { extractText, getDocumentProxy } from "unpdf";
import { ResumeExtractionError } from "../extract";

export const MIN_USABLE_TEXT_CHARACTERS_PER_PAGE = 8;

export type PdfDocumentType = "scanned" | "mixed" | "text";

export type PdfTextExtraction = {
  totalPages: number;
  text: string;
  pageTexts: string[];
};

export type PdfTextProfile = {
  documentType: PdfDocumentType;
  pageCharacterCounts: number[];
  pagesNeedingOcr: number[];
};

function copyBytes(bytes: Uint8Array): Uint8Array {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

function countTextCharacters(text: string): number {
  return text.replace(/\s/gu, "").length;
}

export function detectPdfTextProfile(args: {
  totalPages: number;
  text: string;
  pageTexts?: readonly string[];
}): PdfTextProfile {
  const fallbackPages = Array.from(
    { length: args.totalPages },
    () => args.text,
  );
  const pageTexts =
    args.pageTexts?.length === args.totalPages
      ? [...args.pageTexts]
      : fallbackPages;
  const pageCharacterCounts = pageTexts.map(countTextCharacters);
  const pagesNeedingOcr = pageCharacterCounts.flatMap((count, index) =>
    count < MIN_USABLE_TEXT_CHARACTERS_PER_PAGE ? [index + 1] : [],
  );

  let documentType: PdfDocumentType = "text";
  if (pagesNeedingOcr.length === args.totalPages) documentType = "scanned";
  else if (pagesNeedingOcr.length > 0) documentType = "mixed";

  return { documentType, pageCharacterCounts, pagesNeedingOcr };
}

export function textLayerWarning(profile: PdfTextProfile): string | null {
  if (profile.documentType === "scanned") {
    return "No usable PDF text layer was detected; OCR is required before scoring.";
  }
  if (profile.documentType === "mixed") {
    return `PDF pages ${profile.pagesNeedingOcr.join(", ")} lack a usable text layer; OCR is required before scoring.`;
  }
  return null;
}

export async function extractPdfTextLayers(
  pdf: Uint8Array,
  limits: { maxPages: number; maxCharacters: number },
): Promise<PdfTextExtraction> {
  let document;
  try {
    document = await getDocumentProxy(copyBytes(pdf));
  } catch {
    throw new ResumeExtractionError("INVALID_PDF");
  }

  if (document.numPages > limits.maxPages) {
    throw new ResumeExtractionError("PAGE_LIMIT");
  }

  try {
    const extracted = await extractText(document, { mergePages: false });
    const pageTexts = extracted.text;
    const text = pageTexts.join("\n\n");
    if (text.length > limits.maxCharacters) {
      throw new ResumeExtractionError("TEXT_LIMIT");
    }
    return { totalPages: extracted.totalPages, text, pageTexts };
  } catch (error) {
    if (error instanceof ResumeExtractionError) throw error;
    throw new ResumeExtractionError("INVALID_PDF");
  }
}
