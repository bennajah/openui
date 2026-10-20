---
title: Radio
description: A native radio input. Group inputs by sharing a name and pair them with Label.
order: 6
group: components
component: radio
demo: radio-basic
---

# Radio

Radio renders a native `<input type="radio">` with Tailwind accents. Group
radios by giving them the same `name`, then wrap the group in a `<fieldset>`
with a `<legend>`.

## Usage

```tsx
import { Radio } from "@/components/ui/radio";

<Radio name="plan" value="pro" />
<Radio name="plan" value="team" />;
```

## Props

| Prop      | Type      | Default | Description            |
| --------- | --------- | ------- | ---------------------- |
| `invalid` | `boolean` | `false` | Adds an error outline. |

## Accessibility

Radio uses a `data-invalid` attribute rather than `aria-invalid`, because
`aria-invalid` is not valid on `role="radio"`. Style the error state with
`data-[invalid]:…` utilities or the outline the component already applies.
