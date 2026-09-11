export const THEME_STORAGE_KEY = "resumide-theme";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = Exclude<ThemePreference, "system">;

export function normalizeThemePreference(
  value: string | null | undefined,
): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : "system";
}

export function resolveThemePreference(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

function systemPrefersDark() {
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
}

export function readThemePreference(): ThemePreference {
  try {
    return normalizeThemePreference(
      window.localStorage.getItem(THEME_STORAGE_KEY),
    );
  } catch {
    return "system";
  }
}

export function storeThemePreference(preference: ThemePreference) {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // The applied theme still works when storage is unavailable.
  }
}

export function applyThemePreference(preference: ThemePreference) {
  const resolved = resolveThemePreference(preference, systemPrefersDark());
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePreference = preference;
  root.style.colorScheme = resolved;
}

export function createThemeBootstrapScript() {
  return `(() => {
    const key = ${JSON.stringify(THEME_STORAGE_KEY)};
    const valid = new Set(["light", "dark", "system"]);
    let preference = "system";
    try {
      const stored = window.localStorage.getItem(key);
      if (stored && valid.has(stored)) preference = stored;
    } catch {}
    const isDark = preference === "dark" ||
      (preference === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    const theme = isDark ? "dark" : "light";
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = theme;
  })();`;
}
