import { describe, expect, it } from "vitest";
import {
  methodNotAllowedResponse,
  PublicApiError,
  toErrorResponse,
} from "../../app/lib/server/errors";

describe("public error contracts", () => {
  it("returns stable public errors with request IDs", async () => {
    const response = toErrorResponse(
      new PublicApiError("INVALID_PDF", "Only PDF files are accepted.", 400),
      "request-123",
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("X-Request-Id")).toBe("request-123");
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INVALID_PDF",
        message: "Only PDF files are accepted.",
        retryable: false,
        requestId: "request-123",
      },
    });
  });

  it("does not expose internal errors", async () => {
    const response = toErrorResponse(new Error("secret"), "request-456");
    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Unable to analyze the resume right now.",
        retryable: true,
        requestId: "request-456",
      },
    });
  });

  it("returns an Allow header for method errors", async () => {
    const response = methodNotAllowedResponse("request-789", ["POST"]);
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });
});
