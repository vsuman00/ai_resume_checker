import { describe, expect, it } from "vitest";
import {
  methodNotAllowedResponse,
  PublicApiError,
  toErrorResponse,
} from "../../app/lib/server/errors";

describe("public HTTP error matrix", () => {
  const cases = [
    ["INVALID_REQUEST", 400, false],
    ["UNAUTHENTICATED", 401, false],
    ["FORBIDDEN", 403, false],
    ["NOT_FOUND", 404, false],
    ["PAYLOAD_TOO_LARGE", 413, false],
    ["UNPROCESSABLE_INPUT", 422, false],
    ["RATE_LIMITED", 429, true],
    ["SERVICE_UNAVAILABLE", 503, true],
  ] as const;

  it.each(cases)("returns %s as %i", async (code, status, retryable) => {
    const response = toErrorResponse(
      new PublicApiError(
        code,
        "Safe public message.",
        status,
        retryable,
        status === 429 ? 60 : undefined,
      ),
      "request-id",
    );
    const body = await response.json();
    expect(response.status).toBe(status);
    expect(body.error).toEqual({
      code,
      message: "Safe public message.",
      retryable,
      requestId: "request-id",
    });
    if (status === 429) expect(response.headers.get("Retry-After")).toBe("60");
  });

  it("returns 405 with Allow", async () => {
    const response = methodNotAllowedResponse("request-id", ["POST"]);
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
  });

  it("returns a safe 500 without leaking sensitive details", async () => {
    const response = toErrorResponse(
      new Error("sk-secret prompt raw PDF text stack"),
      "request-id",
    );
    const serialized = JSON.stringify(await response.json());
    expect(response.status).toBe(500);
    expect(serialized).not.toMatch(/sk-secret|prompt|raw PDF|stack/);
  });
});
