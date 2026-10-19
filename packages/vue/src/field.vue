<script setup>
/**
 * OpenUI Field — framework-native, zero runtime dependencies.
 *
 * Composes a label, a control, and a hint or error message with the wiring a
 * form control needs: `for`/`id`, `aria-describedby`, and `aria-invalid`.
 * The default slot receives `controlProps`, an object that can be spread
 * directly onto any control:
 *
 *   <Field label="Email" :error="message">
 *     <template #default="{ controlProps }">
 *       <Input v-bind="controlProps" />
 *     </template>
 *   </Field>
 */
import { computed, useId } from "vue";

defineOptions({ inheritAttrs: false });

const props = defineProps({
  label: { type: String, default: "" },
  hint: { type: String, default: "" },
  error: { type: String, default: "" },
  id: { type: String, default: "" },
});

const generatedId = useId();
const controlId = computed(() => props.id || `field-${generatedId}`);
const describedBy = computed(() => {
  /** @type {string[]} */
  const ids = [];
  if (props.hint) ids.push(`${controlId.value}-hint`);
  if (props.error) ids.push(`${controlId.value}-error`);
  return ids.length > 0 ? ids.join(" ") : undefined;
});

const LABEL_CLASSES = "text-sm font-medium leading-none text-zinc-900 dark:text-zinc-50";
const controlProps = computed(() => ({
  id: controlId.value,
  ariaDescribedby: describedBy.value,
  ariaInvalid: props.error ? true : undefined,
}));
</script>

<template>
  <div class="flex flex-col gap-2">
    <label :for="controlId" :class="LABEL_CLASSES">
      <slot name="label">{{ label }}</slot>
    </label>
    <slot :control-props="controlProps" />
    <p v-if="hint" :id="`${controlId}-hint`" class="text-xs text-zinc-500 dark:text-zinc-400">
      {{ hint }}
    </p>
    <p
      v-if="error"
      :id="`${controlId}-error`"
      class="text-xs font-medium text-red-600 dark:text-red-400"
    >
      {{ error }}
    </p>
  </div>
</template>
