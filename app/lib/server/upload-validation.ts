import { PublicApiError } from "./errors.ts";

const PDF_SIGNATURE = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

export function validateJobDetails(
  jobTitle: string,
  jobDescription: string,
  limits: { maxTitleCharacters: number; maxDescriptionCharacters: number },
) {
  if (
    jobTitle.length > limits.maxTitleCharacters ||
    jobDescription.length > limits.maxDescriptionCharacters
  ) {
    throw new PublicApiError(
      "UNPROCESSABLE_INPUT",
      "The job details exceed the allowed length.",
      422,
    );
  }
}

export async function validatePdfUpload(
  file: File,
  maxBytes: number,
): Promise<Buffer> {
  if (file.size === 0) {
    throw new PublicApiError("INVALID_PDF", "The uploaded PDF is empty.", 400);
  }
  if (file.size > maxBytes) {
    throw new PublicApiError(
      "PAYLOAD_TOO_LARGE",
      "The PDF exceeds the allowed size.",
      413,
    );
  }
  if (file.type && file.type !== "application/pdf") {
    throw new PublicApiError(
      "INVALID_PDF",
      "Only PDF files are accepted.",
      400,
    );
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const hasPdfSignature = PDF_SIGNATURE.every(
    (byte, index) => bytes[index] === byte,
  );
  if (!hasPdfSignature) {
    throw new PublicApiError(
      "INVALID_PDF",
      "The uploaded file is not a valid PDF.",
      400,
    );
  }

  return Buffer.from(bytes);
}
