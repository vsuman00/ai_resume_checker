import { describe, expect, it } from "vitest";
import {
  normalizeThemePreference,
  resolveThemePreference,
} from "../../app/lib/theme";

describe("theme preferences", () => {
  it("accepts the three supported preferences and rejects stored junk", () => {
    expect(normalizeThemePreference("light")).toBe("light");
    expect(normalizeThemePreference("dark")).toBe("dark");
    expect(normalizeThemePreference("system")).toBe("system");
    expect(normalizeThemePreference("sepia")).toBe("system");
    expect(normalizeThemePreference(null)).toBe("system");
  });

  it("resolves explicit preferences without consulting the system", () => {
    expect(resolveThemePreference("light", true)).toBe("light");
    expect(resolveThemePreference("dark", false)).toBe("dark");
  });

  it("resolves the system preference to the current color scheme", () => {
    expect(resolveThemePreference("system", true)).toBe("dark");
    expect(resolveThemePreference("system", false)).toBe("light");
  });
});
