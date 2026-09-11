import { createHash } from "node:crypto";
import {
  FormDataParseError,
  MaxFilesExceededError,
  MaxFileSizeExceededError,
  MaxHeaderSizeExceededError,
  MaxPartsExceededError,
  MaxTotalSizeExceededError,
  parseFormData,
} from "@remix-run/form-data-parser";
import { PublicApiError } from "./errors";

const MAX_ANALYZE_PARTS = 5;
const MAX_MULTIPART_HEADER_BYTES = 8 * 1024;
const NON_FILE_CONTENT_ALLOWANCE_BYTES = 64 * 1024;

export function analysisRateLimitKey(userId: string): string {
  return createHash("sha256").update(userId).digest("hex");
}

export async function parseBoundedAnalyzeFormData(
  request: Request,
  maxUploadBytes: number,
): Promise<FormData> {
  try {
    return await parseFormData(request, {
      maxFiles: 1,
      maxFileSize: maxUploadBytes,
      maxHeaderSize: MAX_MULTIPART_HEADER_BYTES,
      maxParts: MAX_ANALYZE_PARTS,
      maxTotalSize: maxUploadBytes + NON_FILE_CONTENT_ALLOWANCE_BYTES,
    });
  } catch (error) {
    if (
      error instanceof MaxFilesExceededError ||
      error instanceof MaxFileSizeExceededError ||
      error instanceof MaxHeaderSizeExceededError ||
      error instanceof MaxPartsExceededError ||
      error instanceof MaxTotalSizeExceededError
    ) {
      throw new PublicApiError(
        "PAYLOAD_TOO_LARGE",
        "The request exceeds the allowed size.",
        413,
      );
    }
    if (error instanceof FormDataParseError) {
      throw new PublicApiError(
        "INVALID_REQUEST",
        "The request body is not valid form data.",
        400,
      );
    }
    throw error;
  }
}
