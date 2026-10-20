---
title: Checkbox
description: A native checkbox input styled with Tailwind accents and an invalid state.
order: 5
group: components
component: checkbox
demo: checkbox-basic
---

# Checkbox

Checkbox renders a native `<input type="checkbox">` styled with Tailwind
accents. Pair it with a [Label](/docs/components/label) for an accessible name.

## Usage

```tsx
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

<Checkbox id="terms" name="terms" value="accepted" />
<Label htmlFor="terms">Accept the terms</Label>;
```

## Props

| Prop      | Type      | Default | Description                                    |
| --------- | --------- | ------- | ---------------------------------------------- |
| `invalid` | `boolean` | `false` | Adds an error outline and sets `aria-invalid`. |

## Accessibility

- `checked`, `defaultChecked`, and `disabled` are native attributes forwarded
  to the input.
- `invalid` sets `aria-invalid`, which is valid on `role="checkbox"`.
