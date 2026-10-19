---
name: openui-components
description: Use when adding or editing OpenUI components across React, Svelte, Astro, and Vue. Covers parity, zero-dependency styling, JavaScript/TypeScript source rules, accessibility, registry sources, and per-framework tests.
---

# OpenUI components

## When to use this skill

- Adding a component or a new variant/size.
- Fixing a framework-specific rendering bug.
- Reviewing a component for parity or accessibility.
- Changing how components are authored for JS/TS consumers.

## Principles

- **Zero runtime dependencies.** Only framework primitives and Tailwind
  utilities. Do not import `clsx`, `tailwind-merge`, `class-variance-authority`,
  or `@openui/*` in component sources.
- **No class merge library.** Variant and size class sets must be disjoint, then
  join with a local helper:

  ```ts
  function cn(...classes: Array<string | false | null | undefined>): string {
    return classes.filter(Boolean).join(" ");
  }
  ```

- **Native semantics.** Render the real element (`<button>`, `<input>`), keep
  native attributes working, and default `type="button"` for buttons.
- **Parity across frameworks.** Same prop names, defaults, variant sets, class
  strings, and accessibility behavior.
- **Framework sources are canonical.** Edit `packages/<framework>/src`; the
  registry copies them at build time.

## File layout

```
packages/react/src/button.tsx
packages/svelte/src/button.svelte
packages/astro/src/button.astro
packages/vue/src/button.vue
registry/openui-registry.json        # source mapping + docs metadata
```

## Language rules

- React ships TypeScript. `openui build` generates a `.jsx` sibling by
  transpiling the `.tsx` with the TypeScript compiler.
- Svelte, Astro, and Vue must be **plain JavaScript with JSDoc types**. Do not
  add `lang="ts"`: the same file must install into TS and JS projects.
- Vue: `defineProps({...})` with runtime validators; no `withDefaults` TS
  generics.
- Svelte: Svelte 5 runes (`$props`, `$derived`) and snippets
  (`{@render children?.()}`), not legacy slots.
- Astro: plain frontmatter, `Astro.props`, default slot.

## Workflow: add a component

1. Implement it natively in all four framework packages, starting from the
   closest existing component.
2. Keep the class maps and defaults identical across frameworks.
3. Add source entries to `registry/openui-registry.json` with targets such as
   `{ui}/badge.tsx`; set `languageVariants: true` only for React TSX.
4. Add `meta` (variants, sizes, props) for docs and LLM output.
5. Add tests in each package:
   - React: `renderToStaticMarkup` assertions.
   - Svelte: compile with `svelte/compiler` and render with `svelte/server`.
   - Astro: `transform` from `@astrojs/compiler-rs`.
   - Vue: `parse`/`compileScript` from `vue/compiler-sfc`, then SSR render.
6. Document it in `apps/docs/content/docs/components.md`.
7. Rebuild and verify:

   ```bash
   bun run registry:build
   bun run registry:validate
   bun test
   bun run verify
   ```

## Accessibility checklist

- Real interactive element and keyboard behavior.
- Visible `focus-visible` ring with offset.
- Disabled styles plus `disabled` and `pointer-events-none`.
- Icon-only usage documented with `aria-label`.
- Sufficient contrast in light and dark mode.
- Do not remove focus outlines without a replacement.

## Pitfalls

- Adding `lang="ts"` to Svelte/Astro/Vue breaks JavaScript consumers.
- Two variants sharing the same Tailwind property can make the naive join
  ambiguous; make them disjoint or document the precedence.
- Changing classes in one framework only creates parity drift. Update all four.
- Forgetting `languageVariants` means JavaScript React projects receive `.tsx`.
- Forgetting the manifest means the component exists in source but is not
  installable.
- Component tests must not import the component from `@openui/*`; import the
  source file to test exactly what users receive.
