<script setup>
/**
 * OpenUI Select — framework-native, zero runtime dependencies.
 *
 * Plain `<script setup>` (no `lang="ts"`) so the same source installs into
 * TypeScript and JavaScript Vue projects.
 */
import { computed } from "vue";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  invalid: { type: Boolean, default: false },
});

const BASE_CLASSES =
  "flex h-10 w-full appearance-none rounded-md border bg-white py-2 pr-9 pl-3 text-sm text-zinc-900 shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-950 dark:text-zinc-50 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const classes = computed(() =>
  [
    BASE_CLASSES,
    props.invalid ? "border-red-500 dark:border-red-400" : "border-zinc-300 dark:border-zinc-700",
  ]
    .filter(Boolean)
    .join(" "),
);
</script>

<template>
  <div class="relative">
    <select v-bind="$attrs" :aria-invalid="invalid || undefined" :class="classes">
      <slot />
    </select>
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="currentColor"
      class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-zinc-500 dark:text-zinc-400"
    >
      <path
        fill-rule="evenodd"
        d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
        clip-rule="evenodd"
      />
    </svg>
  </div>
</template>
