<script setup>
/**
 * OpenUI ThemeToggle — framework-native, zero runtime dependencies.
 *
 * Plain `<script setup>` (no `lang="ts"`) so the same source installs into
 * TypeScript and JavaScript Vue projects.
 *
 * A native button that cycles `light → dark → system`, persists the choice, and
 * keeps the `dark` class on `<html>` in sync.
 */
import { computed, onMounted, ref } from "vue";
import { applyTheme, readTheme } from "./theme.ts";

const props = defineProps({
  initialTheme: {
    type: String,
    default: "system",
    validator: (value) => ["light", "dark", "system"].includes(value),
  },
  title: { type: String, default: "" },
});

const BASE_CLASSES =
  "inline-flex size-9 items-center justify-center rounded-md text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white dark:focus-visible:ring-zinc-600 dark:focus-visible:ring-offset-zinc-950";

const LABEL = { light: "Light theme", dark: "Dark theme", system: "System theme" };
const NEXT = { light: "dark", dark: "system", system: "light" };

const theme = ref(props.initialTheme);

const classes = computed(() => BASE_CLASSES);
const label = computed(() => `Theme: ${LABEL[theme.value]}. Click to switch.`);

onMounted(() => {
  theme.value = readTheme();
});

function toggle() {
  const next = NEXT[theme.value];
  applyTheme(next);
  theme.value = next;
}
</script>

<template>
  <button
    type="button"
    :aria-label="label"
    :title="props.title || label"
    :class="classes"
    @click="toggle"
  >
    <svg
      v-if="theme === 'light'"
      class="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path
        d="M12 2v2m0 16v2M4.93 4.93l1.41 1.41m11.32 11.32 1.41 1.41M2 12h2m16 0h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      />
    </svg>
    <svg
      v-else-if="theme === 'dark'"
      class="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </svg>
    <svg
      v-else
      class="size-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8m-4-4v4" />
    </svg>
  </button>
</template>
