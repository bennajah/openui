import { useCallback, useSyncExternalStore } from "react";

/**
 * OpenUI theme runtime — framework-native, zero runtime dependencies.
 *
 * The theme is a single value: `"light"`, `"dark"`, or `"system"`. `"system"`
 * resolves against `prefers-color-scheme`. The resolved theme is applied as a
 * `dark` class on `<html>`, so Tailwind's `dark:` variant works without a
 * config change — pair it with the `@custom-variant` shown in the docs.
 *
 * Import this once near your app entry, then use `useTheme()` anywhere:
 *
 *   import { initTheme } from "@/components/ui/theme";
 *   initTheme();
 */

export type Theme = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";

export const THEME_STORAGE_KEY = "openui-theme";
export const THEME_CLASS = "dark";

/** Inline this in `<head>` to apply the theme before first paint (no flash). */
export const THEME_INIT_SCRIPT = `(function(){try{var p=localStorage.getItem("${THEME_STORAGE_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("${THEME_CLASS}",d);}catch(e){}})();`;

function systemPrefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function readTheme(): Theme {
  if (typeof localStorage === "undefined") return "system";
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" || value === "system" ? value : "system";
  } catch {
    return "system";
  }
}

export function resolveTheme(theme: Theme): ResolvedTheme {
  if (theme === "system") return systemPrefersDark() ? "dark" : "light";
  return theme;
}

/** Apply a theme to `<html>` and persist it. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle(THEME_CLASS, resolveTheme(theme) === "dark");
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* storage unavailable (private mode, SSR): the class is still applied */
  }
}

/**
 * Apply the persisted theme and keep `system` in sync with the OS. Safe to call
 * once from an app entry point.
 */
export function initTheme(): () => void {
  if (typeof window === "undefined") return () => {};
  applyTheme(readTheme());
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readTheme() === "system") applyTheme("system");
  };
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** Read and update the theme from a component. */
export function useTheme(): {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
} {
  // `readTheme` reads localStorage, an external store; `useSyncExternalStore`
  // subscribes without an effect and is hydration-safe via the server snapshot.
  const theme = useSyncExternalStore(subscribeTheme, readThemeSnapshot, serverThemeSnapshot);
  const resolvedTheme = useSyncExternalStore(
    subscribeTheme,
    (): ResolvedTheme => resolveTheme(readTheme()),
    (): ResolvedTheme => "light",
  );

  const setTheme = useCallback((next: Theme) => {
    applyTheme(next);
    // Notify subscribers (including this component) that the store changed.
    emitThemeChange();
  }, []);

  return { theme, resolvedTheme, setTheme };
}

const themeListeners = new Set<() => void>();
let mediaBound = false;

export function subscribeTheme(listener: () => void): () => void {
  themeListeners.add(listener);
  if (!mediaBound && typeof window !== "undefined") {
    mediaBound = true;
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
      if (readTheme() === "system") applyTheme("system");
      emitThemeChange();
    });
  }
  return () => themeListeners.delete(listener);
}

function emitThemeChange(): void {
  for (const listener of themeListeners) listener();
}

/** Notify theme subscribers that the stored preference changed. */
export function notifyThemeChange(): void {
  emitThemeChange();
}

/** Snapshot for `useSyncExternalStore`: the stored preference, not the resolution. */
export function readThemeSnapshot(): Theme {
  return readTheme();
}

/** Server snapshot for `useSyncExternalStore`: predictable, hydration-safe. */
export function serverThemeSnapshot(): Theme {
  return "system";
}
