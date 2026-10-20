---
title: Field
description: Composes a label, control, and hint or error message with for/id and aria-describedby wiring.
order: 8
group: components
component: field
demo: field-basic
---

# Field

Field composes a label, a control, and an optional hint or error message, and
computes the wiring a control needs: a generated `id`, `aria-describedby` for
the hint and error text, and `aria-invalid` when there is an error.

## Props

| Prop    | Type     | Default   | Description                                  |
| ------- | -------- | --------- | -------------------------------------------- |
| `label` | `string` | `""`      | Visible label text.                          |
| `hint`  | `string` | `""`      | Helper text, linked with `aria-describedby`. |
| `error` | `string` | `""`      | Error text; also marks the control invalid.  |
| `id`    | `string` | generated | Control id. Generated when omitted.          |

## Wiring a control

The component hands the wiring to the control as a **`controlProps`** object.
Spread it onto any control so the control and the messages stay linked.

```tsx
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

<Field label="Email" hint="We never share it." error={message}>
  {({ controlProps }) => <Input type="email" {...controlProps} />}
</Field>;
```

```svelte
<Field label="Email" hint="We never share it." error={message}>
  {#snippet control({ controlProps })}
    <Input type="email" {...controlProps} />
  {/snippet}
</Field>
```

```vue
<Field label="Email" hint="We never share it." :error="message">
  <template #default="{ controlProps }">
    <Input type="email" v-bind="controlProps" />
  </template>
</Field>
```

In Astro, render the control inside the default slot and pass the same `id` and
`aria-describedby` you give the Field. The component also exposes
`data-control-id`, `data-described-by`, and `data-invalid` on its wrapper:

```astro
<Field label="Email" id="email" hint="We never share it." error={message}>
  <Input id="email" type="email" aria-describedby={message ? "email-error" : "email-hint"} />
</Field>
```

## Accessibility

- The label is bound to the control with `for`/`id`.
- `aria-describedby` lists the hint and error ids, so a screen reader announces
  both.
- `aria-invalid` is set on the control only when `error` is present.
