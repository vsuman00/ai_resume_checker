import assert from "node:assert/strict";
import {
  methodNotAllowedResponse,
  PublicApiError,
  toErrorResponse,
} from "../app/lib/server/errors.ts";

const requestId = "b36f0c9e-3de1-440c-a9ff-1d6e5ddf7a81";

const invalidPdf = toErrorResponse(
  new PublicApiError("INVALID_PDF", "Only PDF files are accepted.", 400),
  requestId,
);
assert.equal(invalidPdf.status, 400);
assert.equal(invalidPdf.headers.get("X-Request-Id"), requestId);
assert.deepEqual(await invalidPdf.json(), {
  error: {
    code: "INVALID_PDF",
    message: "Only PDF files are accepted.",
    requestId,
    retryable: false,
  },
});

const internal = toErrorResponse(
  new Error("secret provider detail"),
  requestId,
);
assert.equal(internal.status, 500);
assert.equal(internal.headers.get("X-Request-Id"), requestId);
const internalBody = await internal.json();
assert.deepEqual(internalBody, {
  error: {
    code: "INTERNAL_ERROR",
    message: "Unable to analyze the resume right now.",
    requestId,
    retryable: true,
  },
});
assert.doesNotMatch(JSON.stringify(internalBody), /secret provider detail/);

const methodNotAllowed = methodNotAllowedResponse(requestId, ["POST"]);
assert.equal(methodNotAllowed.status, 405);
assert.equal(methodNotAllowed.headers.get("Allow"), "POST");
assert.equal(methodNotAllowed.headers.get("X-Request-Id"), requestId);
assert.deepEqual(await methodNotAllowed.json(), {
  error: {
    code: "METHOD_NOT_ALLOWED",
    message: "Method not allowed.",
    requestId,
    retryable: false,
  },
});

console.log("Error contract self-check passed.");
