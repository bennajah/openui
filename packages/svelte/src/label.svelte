<script>
  /**
   * OpenUI Label — framework-native, zero runtime dependencies.
   *
   * Plain JavaScript with JSDoc types so the same source installs into
   * TypeScript and JavaScript Svelte projects. Svelte 5 runes.
   */

  /** @type {{ class?: string, children?: import("svelte").Snippet, [key: string]: unknown }} */
  let { class: className = "", children, ...rest } = $props();

  const BASE_CLASSES =
    "text-sm font-medium leading-none text-zinc-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-zinc-50";

  const classes = $derived([BASE_CLASSES, className].filter(Boolean).join(" "));
</script>

<label class={classes} {...rest}>
  {@render children?.()}
</label>
