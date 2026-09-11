import { describe, expect, it } from "vitest";
import {
  validateJobDetails,
  validatePdfUpload,
} from "../../app/lib/server/upload-validation";

describe("upload validation", () => {
  it("accepts a PDF signature", async () => {
    const file = new File(
      [new Uint8Array([37, 80, 68, 70, 45])],
      "resume.pdf",
      {
        type: "application/pdf",
      },
    );
    await expect(validatePdfUpload(file, 10)).resolves.toBeInstanceOf(Buffer);
  });

  it("rejects spoofed and oversized files", async () => {
    const spoofed = new File(["not pdf"], "resume.pdf", {
      type: "application/pdf",
    });
    await expect(validatePdfUpload(spoofed, 100)).rejects.toMatchObject({
      code: "INVALID_PDF",
      status: 400,
    });
    const oversized = new File([new Uint8Array(11)], "resume.pdf", {
      type: "application/pdf",
    });
    await expect(validatePdfUpload(oversized, 10)).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
      status: 413,
    });
  });

  it("enforces job detail limits", () => {
    expect(() =>
      validateJobDetails("x".repeat(121), "", {
        maxTitleCharacters: 120,
        maxDescriptionCharacters: 100,
      }),
    ).toThrow();
  });
});
