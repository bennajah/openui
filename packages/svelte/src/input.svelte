<script>
  /**
   * OpenUI Input — framework-native, zero runtime dependencies.
   *
   * Plain JavaScript with JSDoc types so the same source installs into
   * TypeScript and JavaScript Svelte projects. Svelte 5 runes.
   */

  /** @type {{ invalid?: boolean, class?: string, [key: string]: unknown }} */
  let { invalid = false, class: className = "", ...rest } = $props();

  const BASE_CLASSES =
    "flex h-10 w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm transition-colors placeholder:text-zinc-500 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder:text-zinc-400 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

  const classes = $derived(
    [
      BASE_CLASSES,
      invalid
        ? "border-red-500 dark:border-red-400"
        : "border-zinc-300 dark:border-zinc-700",
      className,
    ]
      .filter(Boolean)
      .join(" "),
  );
</script>

<input aria-invalid={invalid || undefined} class={classes} {...rest} />
