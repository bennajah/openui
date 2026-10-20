---
title: Label
description: A native label with form typography and peer-disabled styling.
order: 7
group: components
component: label
demo: label-basic
---

# Label

Label renders a native `<label>` with form typography. Associate it with a
control with `htmlFor` (React) / `for` (Svelte, Astro, Vue), or wrap the control
directly.

## Usage

```tsx
import { Label } from "@/components/ui/label";

<Label htmlFor="email">Email</Label>;
```

## Props

Label takes no component-specific props. Every native attribute is forwarded,
and `peer-disabled:cursor-not-allowed peer-disabled:opacity-70` means a label
placed after a `peer` control fades with it.

## Accessibility

- A label bound with `htmlFor`/`for` gives its control an accessible name and
  makes clicking the text focus the control.
- Both patterns work: explicit association (`htmlFor`) and implicit wrapping.
