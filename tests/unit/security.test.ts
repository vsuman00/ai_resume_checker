import { describe, expect, it } from "vitest";
import {
  assertSameOrigin,
  createSecurityHeaders,
  isSameOriginRequest,
} from "../../app/lib/server/security";
import { getSessionCookieOptions } from "../../app/lib/server/supabase";

describe("security policy", () => {
  it("sets browser security headers and keeps CSP in report-only mode by default", () => {
    const headers = createSecurityHeaders({
      appOrigin: "https://resumide.example",
      environment: "production",
      cspMode: "report-only",
    });

    expect(headers.get("Content-Security-Policy-Report-Only")).toContain(
      "default-src 'self'",
    );
    expect(headers.get("Content-Security-Policy")).toBeNull();
    expect(headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin",
    );
    expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
  });

  it("does not send HSTS for local or non-HTTPS environments", () => {
    const headers = createSecurityHeaders({
      appOrigin: "http://localhost:3110",
      environment: "development",
      cspMode: "enforce",
    });

    expect(headers.get("Strict-Transport-Security")).toBeNull();
    expect(headers.get("Content-Security-Policy")).toContain(
      "frame-ancestors 'none'",
    );
  });

  it("accepts same-origin browser requests and rejects cross-origin requests", () => {
    const allowed = new Request("https://resumide.example/upload", {
      method: "POST",
      headers: { Origin: "https://resumide.example" },
    });
    const denied = new Request("https://resumide.example/upload", {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
    });

    expect(isSameOriginRequest(allowed, "https://resumide.example")).toBe(true);
    expect(isSameOriginRequest(denied, "https://resumide.example")).toBe(false);
    expect(() => assertSameOrigin(denied, "https://resumide.example")).toThrow(
      expect.objectContaining({ code: "FORBIDDEN", status: 403 }),
    );
  });

  it("uses a bounded HTTP-only SameSite cookie lifetime", () => {
    expect(getSessionCookieOptions("https://resumide.example", 3_600)).toEqual(
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        secure: true,
        maxAge: 3_600,
      }),
    );
  });
});
