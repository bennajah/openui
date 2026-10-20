---
title: Theme
description: Light, dark, and system theme state with a no-flash init script and a cycling toggle.
order: 9
group: components
component: theme
demo: theme-toggle
---

# Theme

`Theme` ships the state behind dark mode plus a ready-made toggle. It has two
parts you install together:

- `theme` — a small module (`theme.ts`) with the state API and a no-flash init
  script.
- `theme-toggle` — a native icon button that cycles **light → dark → system**.

The theme is a single value, stored under the `openui-theme` key and defaulting
to `system`. The resolved theme is applied as a `dark` class on `<html>`, which
is what Tailwind's `dark:` variant targets.

## Exports

| Export                | Type                            | Description                                       |
| --------------------- | ------------------------------- | ------------------------------------------------- |
| `readTheme()`         | `"light" \| "dark" \| "system"` | Reads the stored value, falling back to `system`. |
| `applyTheme(theme)`   | `void`                          | Applies the theme to `<html>` and persists it.    |
| `resolveTheme(theme)` | `"light" \| "dark"`             | Resolves `system` against `prefers-color-scheme`. |
| `initTheme()`         | `() => void`                    | Applies the stored theme and follows OS changes.  |
| `THEME_INIT_SCRIPT`   | `string`                        | Inline script for `<head>`; prevents a flash.     |

## Setup

Add the init script to `<head>` so the stored theme applies before first paint,
call `initTheme()` once, and drop in the toggle:

```tsx
// app entry
import { initTheme } from "@/components/ui/theme";
initTheme();

// <head> — prevents a flash of the wrong theme
<script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;

// anywhere
<ThemeToggle />;
```

Tailwind CSS v4 needs the variant declared once in your stylesheet:

```css
@custom-variant dark (&:where(.dark, .dark *));
```

## Framework notes

- **React** — also exports `useTheme()` and a `ThemeInitScript` component.
- **Svelte** — call `initTheme()` in your root layout, then use `<ThemeToggle />`.
- **Astro** — the component carries its own scoped client script; add
  `<script is:inline set:html={THEME_INIT_SCRIPT}></script>` in `<head>`.
- **Vue** — call `initTheme()` in `main.ts`, then register `<ThemeToggle />`.

## Accessibility

- The toggle is a real `<button>` with a dynamic `aria-label` that names the
  current theme.
- Each state has its own icon; the inactive icons are `hidden` from the
  accessibility tree, so the button never reads three labels.
