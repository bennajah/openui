<script>
  /**
   * OpenUI Radio — framework-native, zero runtime dependencies.
   *
   * Plain JavaScript with JSDoc types so the same source installs into
   * TypeScript and JavaScript Svelte projects. Svelte 5 runes.
   */

  /** @type {{ invalid?: boolean, class?: string, [key: string]: unknown }} */
  let { invalid = false, class: className = "", ...rest } = $props();

  const BASE_CLASSES =
    "size-4 shrink-0 cursor-pointer accent-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:accent-zinc-50 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

  const classes = $derived(
    [BASE_CLASSES, invalid ? "outline outline-1 outline-red-500 dark:outline-red-400" : "", className]
      .filter(Boolean)
      .join(" "),
  );
</script>

<input type="radio" data-invalid={invalid || undefined} class={classes} {...rest} />
