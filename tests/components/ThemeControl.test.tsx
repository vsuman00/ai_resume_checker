/** @vitest-environment jsdom */

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ThemeControl from "../../app/components/ThemeControl";
import { THEME_STORAGE_KEY } from "../../app/lib/theme";

const matchMedia = (query: string) => ({
  matches: query === "(prefers-color-scheme: dark)",
  media: query,
  onchange: null,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  addListener: vi.fn(),
  removeListener: vi.fn(),
  dispatchEvent: vi.fn(),
});

const storedValues = new Map<string, string>();
const localStorageStub: Storage = {
  get length() {
    return storedValues.size;
  },
  clear: () => storedValues.clear(),
  getItem: (key) => storedValues.get(key) ?? null,
  key: (index) => [...storedValues.keys()][index] ?? null,
  removeItem: (key) => storedValues.delete(key),
  setItem: (key, value) => storedValues.set(key, value),
};

beforeEach(() => {
  Object.defineProperty(window, "localStorage", {
    configurable: true,
    value: localStorageStub,
  });
  window.localStorage.clear();
  document.documentElement.removeAttribute("data-theme");
  document.documentElement.removeAttribute("data-theme-preference");
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: matchMedia,
  });
});

afterEach(() => {
  cleanup();
});

describe("ThemeControl", () => {
  it("uses the saved preference and applies it after hydration", async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, "light");
    render(<ThemeControl />);

    const control = screen.getByRole<HTMLSelectElement>("combobox", {
      name: "Color theme",
    });
    await waitFor(() => expect(control.value).toBe("light"));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.dataset.themePreference).toBe("light");
  });

  it("persists a new explicit preference", async () => {
    const user = userEvent.setup();
    render(<ThemeControl />);

    const control = screen.getByRole("combobox", { name: "Color theme" });
    await user.selectOptions(control, "dark");

    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.dataset.themePreference).toBe("dark");
  });

  it("uses the operating-system color scheme in system mode", async () => {
    render(<ThemeControl />);

    await waitFor(() => {
      expect(document.documentElement.dataset.theme).toBe("dark");
    });
    expect(document.documentElement.dataset.themePreference).toBe("system");
  });
});
