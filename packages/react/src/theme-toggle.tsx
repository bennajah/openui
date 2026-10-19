import type { ButtonHTMLAttributes } from "react";
import { useSyncExternalStore } from "react";
import {
  applyTheme,
  notifyThemeChange,
  readThemeSnapshot,
  subscribeTheme,
  THEME_INIT_SCRIPT,
  type Theme,
} from "./theme.ts";

/**
 * OpenUI ThemeToggle — framework-native, zero runtime dependencies.
 *
 * A native button that cycles `light → dark → system`, persists the choice, and
 * keeps the `dark` class on `<html>` in sync. Render `ThemeInitScript` in
 * `<head>` to apply the stored theme before first paint.
 */

export interface ThemeToggleProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  /** Override the initial value when you render outside a browser. */
  initialTheme?: Theme;
}

const BASE_CLASSES =
  "inline-flex size-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const NEXT: Record<Theme, Theme> = { light: "dark", dark: "system", system: "light" };
const LABEL: Record<Theme, string> = {
  light: "Light theme",
  dark: "Dark theme",
  system: "System theme",
};

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": true,
  className: "size-4",
} as const;

function SunIcon() {
  return (
    <svg {...ICON_PROPS}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg {...ICON_PROPS}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
  );
}

function SystemIcon() {
  return (
    <svg {...ICON_PROPS}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8m-4-4v4" />
    </svg>
  );
}

export function ThemeToggle({ className, initialTheme, title, ...props }: ThemeToggleProps) {
  // Hydration-safe: the server snapshot uses `initialTheme`, then the client
  // reads the stored preference. `initialTheme` is only the SSR fallback.
  const theme = useSyncExternalStore(
    subscribeTheme,
    readThemeSnapshot,
    (): Theme => initialTheme ?? "system",
  );

  const Icon = theme === "light" ? SunIcon : theme === "dark" ? MoonIcon : SystemIcon;
  const label = `Theme: ${LABEL[theme]}. Click to switch.`;

  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      className={[BASE_CLASSES, className].filter(Boolean).join(" ")}
      onClick={() => {
        const next = NEXT[theme];
        applyTheme(next);
        notifyThemeChange();
      }}
      {...props}
    >
      <Icon />
    </button>
  );
}

/** Renders the no-flash theme script. Put it inside `<head>`. */
export function ThemeInitScript() {
  // The script only reads storage and toggles a class; it never renders markup.
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}

export { applyTheme, readTheme, resolveTheme } from "./theme.ts";
