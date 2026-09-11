export type ApiErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_PDF"
  | "PAYLOAD_TOO_LARGE"
  | "UNPROCESSABLE_INPUT"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "METHOD_NOT_ALLOWED"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

type PublicErrorStatus =
  400 | 401 | 403 | 404 | 405 | 413 | 422 | 429 | 500 | 503;

type ErrorBody = {
  code: ApiErrorCode;
  message: string;
  retryable: boolean;
};

export class PublicApiError extends Error {
  readonly code: Exclude<ApiErrorCode, "INTERNAL_ERROR">;
  readonly status: PublicErrorStatus;
  readonly retryable: boolean;
  readonly retryAfterSeconds: number | undefined;

  constructor(
    code: Exclude<ApiErrorCode, "INTERNAL_ERROR">,
    message: string,
    status: PublicErrorStatus,
    retryable = false,
    retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = "PublicApiError";
    this.code = code;
    this.status = status;
    this.retryable = retryable;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function errorResponse(
  body: ErrorBody,
  requestId: string,
  status: PublicErrorStatus,
  headers: HeadersInit = {},
): Response {
  return Response.json(
    { error: { ...body, requestId } },
    {
      status,
      headers: { ...headers, "X-Request-Id": requestId },
    },
  );
}

export function methodNotAllowedResponse(
  requestId: string,
  allowedMethods: string[],
): Response {
  return errorResponse(
    {
      code: "METHOD_NOT_ALLOWED",
      message: "Method not allowed.",
      retryable: false,
    },
    requestId,
    405,
    { Allow: allowedMethods.join(", ") },
  );
}

export function toErrorResponse(error: unknown, requestId: string): Response {
  if (error instanceof PublicApiError) {
    return errorResponse(
      {
        code: error.code,
        message: error.message,
        retryable: error.retryable,
      },
      requestId,
      error.status,
      error.retryAfterSeconds
        ? { "Retry-After": String(error.retryAfterSeconds) }
        : undefined,
    );
  }

  return errorResponse(
    {
      code: "INTERNAL_ERROR",
      message: "Unable to analyze the resume right now.",
      retryable: true,
    },
    requestId,
    500,
  );
}
