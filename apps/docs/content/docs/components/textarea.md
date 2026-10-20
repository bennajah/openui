---
title: Textarea
description: A native multi-line input that shares the Input field treatment.
order: 3
group: components
component: textarea
demo: textarea-basic
---

# Textarea

Textarea wraps a native `<textarea>` in the same field treatment as
[Input](/docs/components/input), with a minimum height so short values still
show a comfortable writing area.

## Usage

```tsx
import { Textarea } from "@/components/ui/textarea";

<Textarea name="bio" rows={6} placeholder="Tell us about yourself" />;
```

## Props

| Prop      | Type      | Default | Description                 |
| --------- | --------- | ------- | --------------------------- |
| `rows`    | `number`  | `4`     | Initial visible line count. |
| `invalid` | `boolean` | `false` | Adds an error treatment.    |

Native attributes are forwarded unchanged.

## Accessibility

- `invalid` sets `aria-invalid` on the native textarea.
- Pair with a [Label](/docs/components/label) or a
  [Field](/docs/components/field) so the control has an accessible name.
