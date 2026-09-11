import { describe, expect, it } from "vitest";
import config from "../../react-router.config";

describe("React Router v8 migration settings", () => {
  it("opts into the v8 behaviors while the app remains on React Router v7", () => {
    expect(config.future).toEqual({
      v8_middleware: true,
      v8_splitRouteModules: true,
      v8_viteEnvironmentApi: true,
      v8_passThroughRequests: true,
      v8_trailingSlashAwareDataRequests: true,
    });
  });
});
