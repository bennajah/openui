<script>
  /**
   * OpenUI Field — framework-native, zero runtime dependencies.
   *
   * Svelte 5 runes. Composes a label, a control, and a hint or error message
   * with `for`/`id`, `aria-describedby`, and `aria-invalid` wiring. The
   * `control` snippet receives `controlProps`, an object that can be spread
   * directly onto any control:
   *
   *   <Field label="Email" error={message}>
   *     {#snippet control({ controlProps })}
   *       <Input {...controlProps} />
   *     {/snippet}
   *   </Field>
   */

  /** @type {{ label?: string, hint?: string, error?: string, id?: string, control?: import("svelte").Snippet<[{ controlProps: Record<string, string | boolean | undefined> }]>, children?: import("svelte").Snippet, class?: string }} */
  let { label = "", hint = "", error = "", id = "", control, children, class: className = "" } = $props();

  const generated = Math.random().toString(36).slice(2, 10);
  const controlId = $derived(id || `field-${generated}`);
  const describedBy = $derived(
    [hint ? `${controlId}-hint` : "", error ? `${controlId}-error` : ""].filter(Boolean).join(" ") ||
      undefined,
  );
  const controlProps = $derived({
    id: controlId,
    "aria-describedby": describedBy,
    "aria-invalid": error ? true : undefined,
  });

  const LABEL_CLASSES = "text-sm font-medium leading-none text-zinc-900 dark:text-zinc-50";

  const classes = $derived(["flex flex-col gap-2", className].filter(Boolean).join(" "));
</script>

<div class={classes}>
  <label for={controlId} class={LABEL_CLASSES}>
    {@render children?.()}
    {label}
  </label>
  {@render control?.({ controlProps })}
  {#if hint}
    <p id={`${controlId}-hint`} class="text-xs text-zinc-500 dark:text-zinc-400">{hint}</p>
  {/if}
  {#if error}
    <p id={`${controlId}-error`} class="text-xs font-medium text-red-600 dark:text-red-400">
      {error}
    </p>
  {/if}
</div>
