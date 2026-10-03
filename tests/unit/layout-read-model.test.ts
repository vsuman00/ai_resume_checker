import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeNativePageLayout } from "../../app/lib/server/native-layout";

const mocks = vi.hoisted(() => ({
  filters: {} as Record<string, string>,
  layout: null as unknown,
  error: null as unknown,
}));
vi.mock("../../app/lib/server/supabase", () => ({
  createSupabaseAdminClient: () => ({
    from: () => ({
      select: () => {
        const query = {
          eq: (key: string, value: string) => {
            mocks.filters[key] = value;
            return query;
          },
          maybeSingle: async () => ({
            data:
              mocks.filters.owner_id === "owner" &&
              mocks.filters.analysis_id === "owned-analysis"
                ? { native_layout: mocks.layout }
                : null,
            error: mocks.error,
          }),
        };
        return query;
      },
    }),
  }),
}));
import { readOwnedNativeLayout } from "../../app/lib/server/layout-read-model";

describe("owner-only layout read model", () => {
  beforeEach(() => {
    mocks.filters = {};
    mocks.error = null;
    mocks.layout = {
      schemaVersion: "native-layout-v1",
      pages: [
        normalizeNativePageLayout(
          1,
          {
            width: 600,
            height: 800,
            rotation: 0,
            convertToViewportPoint: (x, y) => [x, 800 - y],
          },
          [],
          {},
        ),
      ],
    };
  });
  it("returns validated evidence with explicit analysis and owner predicates", async () => {
    expect(await readOwnedNativeLayout("owned-analysis", "owner")).toEqual(
      mocks.layout,
    );
    expect(mocks.filters).toEqual({
      analysis_id: "owned-analysis",
      owner_id: "owner",
    });
  });
  it("does not return evidence to another owner", async () => {
    expect(
      await readOwnedNativeLayout("owned-analysis", "other-owner"),
    ).toBeNull();
  });
  it("returns unavailable for legacy or malformed data", async () => {
    mocks.layout = null;
    expect(await readOwnedNativeLayout("owned-analysis", "owner")).toBeNull();
    mocks.layout = { schemaVersion: "untrusted", pages: [] };
    expect(await readOwnedNativeLayout("owned-analysis", "owner")).toBeNull();
  });
  it("surfaces database failure without raw data", async () => {
    mocks.error = { message: "sensitive" };
    await expect(
      readOwnedNativeLayout("owned-analysis", "owner"),
    ).rejects.toThrow("Layout evidence is unavailable");
  });
});
