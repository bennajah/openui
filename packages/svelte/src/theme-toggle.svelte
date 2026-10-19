<script>
  /**
   * OpenUI ThemeToggle — framework-native, zero runtime dependencies.
   *
   * Svelte 5 runes. A native button that cycles `light → dark → system`,
   * persists the choice, and keeps the `dark` class on `<html>` in sync.
   */
  import { applyTheme, readTheme } from "./theme.ts";

  /** @typedef {"light" | "dark" | "system"} Theme */

  /** @type {{ initialTheme?: Theme, class?: string, title?: string, [key: string]: unknown }} */
  let { initialTheme = "system", class: className = "", title = "", ...rest } = $props();

  /**
   * The stored theme, or the SSR fallback when there is no browser. Reading the
   * prop inside a function keeps it a deferred reference, which is what we want:
   * `initialTheme` is a one-time fallback, not reactive state.
   * @returns {Theme}
   */
  function initial() {
    return typeof localStorage === "undefined" ? initialTheme : readTheme();
  }

  /** @type {Theme} */
  let theme = $state(initial());

  const BASE_CLASSES =
    "inline-flex size-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

  const LABEL = {
    light: "Light theme",
    dark: "Dark theme",
    system: "System theme",
  };

  const NEXT = { light: "dark", dark: "system", system: "light" };

  let classes = $derived([BASE_CLASSES, className].filter(Boolean).join(" "));
  let label = $derived(`Theme: ${LABEL[theme]}. Click to switch.`);

  function toggle() {
    /** @type {Theme} */
    const next = NEXT[theme];
    applyTheme(next);
    theme = next;
  }
</script>

<button
  type="button"
  aria-label={label}
  title={title || label}
  class={classes}
  onclick={toggle}
  {...rest}
>
  {#if theme === "light"}
    <svg
      class="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4"></circle>
      <path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      ></path>
    </svg>
  {:else if theme === "dark"}
    <svg
      class="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
    </svg>
  {:else}
    <svg
      class="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="2"></rect>
      <path d="M8 20h8m-4-4v4"></path>
    </svg>
  {/if}
</button>
