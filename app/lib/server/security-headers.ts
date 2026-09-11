export type CspMode = "report-only" | "enforce";

export function createSecurityHeaders(args: {
  appOrigin: string;
  environment: "development" | "test" | "production";
  cspMode: CspMode;
  cspReportUri?: string;
}): Headers {
  const headers = new Headers({
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy":
      "camera=(), geolocation=(), microphone=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Cross-Origin-Resource-Policy": "same-origin",
  });
  const csp = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    "connect-src 'self'",
    "worker-src 'self' blob:",
  ];
  if (args.cspReportUri) csp.push(`report-uri ${args.cspReportUri}`);
  headers.set(
    args.cspMode === "enforce"
      ? "Content-Security-Policy"
      : "Content-Security-Policy-Report-Only",
    csp.join("; "),
  );

  if (
    args.environment === "production" &&
    args.appOrigin.startsWith("https://")
  ) {
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }
  return headers;
}
