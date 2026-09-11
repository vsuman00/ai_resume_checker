import { PublicApiError } from "./errors";

export { createSecurityHeaders, type CspMode } from "./security-headers";

export function isSameOriginRequest(request: Request, appOrigin: string) {
  const origin = request.headers.get("Origin");
  if (origin) return origin === appOrigin;

  const referer = request.headers.get("Referer");
  if (referer) {
    try {
      return new URL(referer).origin === appOrigin;
    } catch {
      return false;
    }
  }

  // Non-browser callers do not send Origin/Referer. Authentication and route
  // authorization remain mandatory; this check is specifically a browser
  // CSRF defense and must not break trusted server-to-server calls.
  return true;
}

export function assertSameOrigin(request: Request, appOrigin: string): void {
  if (!isSameOriginRequest(request, appOrigin)) {
    throw new PublicApiError("FORBIDDEN", "Origin is not allowed.", 403);
  }
}
