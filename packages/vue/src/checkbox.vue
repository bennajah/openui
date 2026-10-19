<script setup>
/**
 * OpenUI Checkbox — framework-native, zero runtime dependencies.
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
  "size-4 shrink-0 cursor-pointer rounded border-zinc-300 accent-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:accent-zinc-50 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const classes = computed(() =>
  [BASE_CLASSES, props.invalid ? "outline outline-1 outline-red-500 dark:outline-red-400" : ""]
    .filter(Boolean)
    .join(" "),
);
</script>

<template>
  <input v-bind="$attrs" type="checkbox" :aria-invalid="invalid || undefined" :class="classes" />
</template>
