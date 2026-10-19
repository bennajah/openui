<script setup>
/**
 * OpenUI Button — framework-native, zero runtime dependencies.
 *
 * Plain `<script setup>` (no `lang="ts"`) so the same source installs into
 * TypeScript and JavaScript Vue projects.
 */
import { computed } from "vue";

const props = defineProps({
  variant: {
    type: String,
    default: "primary",
    validator: (value) =>
      ["primary", "secondary", "outline", "ghost", "danger", "link"].includes(value),
  },
  size: {
    type: String,
    default: "md",
    validator: (value) => ["sm", "md", "lg", "icon"].includes(value),
  },
  fullWidth: { type: Boolean, default: false },
  type: { type: String, default: "button" },
});

const BASE_CLASSES =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const VARIANT_CLASSES = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-200",
  secondary:
    "bg-zinc-100 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-700",
  outline:
    "border border-zinc-300 bg-transparent text-zinc-900 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-50 dark:hover:bg-zinc-800",
  ghost: "bg-transparent text-zinc-900 hover:bg-zinc-100 dark:text-zinc-50 dark:hover:bg-zinc-800",
  danger: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-400",
  link: "bg-transparent text-zinc-900 underline-offset-4 hover:underline dark:text-zinc-50",
};

const SIZE_CLASSES = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
  icon: "h-10 w-10",
};

const classes = computed(() =>
  [
    BASE_CLASSES,
    VARIANT_CLASSES[props.variant] ?? VARIANT_CLASSES.primary,
    SIZE_CLASSES[props.size] ?? SIZE_CLASSES.md,
    props.fullWidth ? "w-full" : "",
  ]
    .filter(Boolean)
    .join(" "),
);
</script>

<template>
  <button :type="type" :class="classes">
    <slot />
  </button>
</template>
