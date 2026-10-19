<script>
  /**
   * OpenUI Button — framework-native, zero runtime dependencies.
   *
   * Written as plain JavaScript with JSDoc types so the same source installs
   * into both TypeScript and JavaScript Svelte projects. Svelte 5 runes.
   */

  /**
   * @typedef {"primary" | "secondary" | "outline" | "ghost" | "danger" | "link"} ButtonVariant
   * @typedef {"sm" | "md" | "lg" | "icon"} ButtonSize
   */

  /** @type {{ variant?: ButtonVariant, size?: ButtonSize, fullWidth?: boolean, type?: "button" | "submit" | "reset", class?: string, children?: import("svelte").Snippet, [key: string]: unknown }} */
  let {
    variant = "primary",
    size = "md",
    fullWidth = false,
    type = "button",
    class: className = "",
    children,
    ...rest
  } = $props();

  const BASE_CLASSES =
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

  /** @type {Record<ButtonVariant, string>} */
  const VARIANT_CLASSES = {
    primary:
      "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
    secondary:
      "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700",
    outline:
      "border border-zinc-300 bg-transparent text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800",
    ghost:
      "bg-transparent text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800",
    danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400",
    link: "bg-transparent text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50",
  };

  /** @type {Record<ButtonSize, string>} */
  const SIZE_CLASSES = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-10 w-10",
  };

  let classes = $derived(
    [
      BASE_CLASSES,
      VARIANT_CLASSES[variant],
      SIZE_CLASSES[size],
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" "),
  );
</script>

<button {type} class={classes} {...rest}>
  {@render children?.()}
</button>
