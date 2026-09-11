import assert from "node:assert/strict";
import {
  validateJobDetails,
  validatePdfUpload,
} from "../app/lib/server/upload-validation.ts";

const limits = {
  maxTitleCharacters: 120,
  maxDescriptionCharacters: 10_000,
};
const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

const valid = new File([pdfBytes], "resume.pdf", { type: "application/pdf" });
assert.equal((await validatePdfUpload(valid, 10)).length, pdfBytes.length);

await assert.rejects(
  validatePdfUpload(
    new File([pdfBytes], "resume.pdf", { type: "text/plain" }),
    10,
  ),
  (error) => error.code === "INVALID_PDF" && error.status === 400,
);
await assert.rejects(
  validatePdfUpload(
    new File([new Uint8Array([1, 2, 3])], "resume.pdf", {
      type: "application/pdf",
    }),
    10,
  ),
  (error) => error.code === "INVALID_PDF" && error.status === 400,
);
await assert.rejects(
  validatePdfUpload(
    new File([new Uint8Array(11)], "resume.pdf", { type: "application/pdf" }),
    10,
  ),
  (error) => error.code === "PAYLOAD_TOO_LARGE" && error.status === 413,
);

validateJobDetails("Frontend Engineer", "React and TypeScript", limits);
assert.throws(
  () => validateJobDetails("x".repeat(121), "", limits),
  (error) => error.code === "UNPROCESSABLE_INPUT" && error.status === 422,
);
assert.throws(
  () => validateJobDetails("", "x".repeat(10_001), limits),
  (error) => error.code === "UNPROCESSABLE_INPUT" && error.status === 422,
);

console.log("Upload validation self-check passed.");
