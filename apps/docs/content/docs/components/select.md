---
title: Select
description: A native select element with shared field styling and a decorative chevron.
order: 4
group: components
component: select
demo: select-basic
---

# Select

Select wraps a native `<select>` with `appearance-none` and a decorative
chevron. Pass `<option>` elements as children; the component positions the
chevron for you.

## Usage

```tsx
import { Select } from "@/components/ui/select";

<Select name="role" defaultValue="dev">
  <option value="dev">Developer</option>
  <option value="ops">Operations</option>
</Select>;
```

## Props

| Prop      | Type      | Default | Description              |
| --------- | --------- | ------- | ------------------------ |
| `invalid` | `boolean` | `false` | Adds an error treatment. |

Native attributes are forwarded unchanged.

## Accessibility

- The chevron is `aria-hidden` and `pointer-events-none`, so it never
  intercepts a click or reads to a screen reader.
- The native `<select>` keeps platform keyboard behavior, including type-ahead
  and arrow-key selection.
