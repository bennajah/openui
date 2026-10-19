<script setup>
/**
 * OpenUI Label — framework-native, zero runtime dependencies.
 *
 * Plain `<script setup>` (no `lang="ts"`) so the same source installs into
 * TypeScript and JavaScript Vue projects.
 */

defineOptions({ inheritAttrs: false });

const classes =
  "text-sm font-medium leading-none text-zinc-900 peer-disabled:cursor-not-allowed peer-disabled:opacity-70 dark:text-zinc-50";
</script>

<template>
  <label v-bind="$attrs" :class="classes">
    <slot />
  </label>
</template>
