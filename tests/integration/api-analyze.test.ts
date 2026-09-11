import { beforeAll, describe, expect, it } from "vitest";

beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.APP_ORIGIN = "http://localhost:5173";
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_PUBLISHABLE_KEY = "publishable";
  process.env.SUPABASE_SECRET_KEY = "secret";
  process.env.OPENAI_API_KEY = "openai";
});

describe("/api/analyze request contract", async () => {
  const route = await import("../../app/routes/api.analyze");

  it("rejects non-POST requests with Allow", async () => {
    const response = route.loader();
    expect(response.status).toBe(405);
    expect(response.headers.get("Allow")).toBe("POST");
    expect((await response.json()).error.code).toBe("METHOD_NOT_ALLOWED");
  });

  it("rejects unauthenticated requests before parsing multipart data", async () => {
    const response = await route.action({
      request: new Request("http://localhost:5173/api/analyze", {
        method: "POST",
        headers: { Origin: "http://localhost:5173" },
        body: "not multipart",
      }),
    });
    expect(response.status).toBe(401);
    expect((await response.json()).error.code).toBe("UNAUTHENTICATED");
  });
});
