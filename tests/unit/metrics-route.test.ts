import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../app/lib/server/config", () => ({
  getServerConfig: () => ({ METRICS_TOKEN: "metrics-secret" }),
}));

import { loader } from "../../app/routes/metrics";
import { metrics } from "../../app/lib/server/observability";

describe("metrics route", () => {
  beforeEach(() => metrics.reset());

  it("does not reveal whether metrics are enabled without the secret", async () => {
    const response = loader({
      request: new Request("http://localhost/metrics"),
    });
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it("returns protected Prometheus output without caching", async () => {
    metrics.increment("http_requests_total", { route: "/upload", status: 200 });
    const response = loader({
      request: new Request("http://localhost/metrics", {
        headers: { "X-Metrics-Token": "metrics-secret" },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Content-Type")).toContain("text/plain");
    expect(await response.text()).toContain(
      'http_requests_total{route="/upload",status="200"} 1',
    );
  });
});
