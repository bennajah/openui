---
title: React
description: Install and use OpenUI components in React, including TypeScript and JavaScript variants.
order: 1
---

# React

OpenUI ships native React components with typed props. There is no runtime
package: `openui add` writes the component into your project.

## Install

```bash
openui init --framework react
openui add button
```

The CLI installs `.tsx` by default. For a JavaScript project:

```json
{ "typescript": false }
```

or per command:

```bash
openui add button --no-typescript
```

React items include both variants in the registry; the CLI selects one based on
`typescript`.

## Import

With the default `@/` alias and a `tsconfig.json` mapping:

```tsx
import { Button } from "@/components/ui/button";
```

The destination comes from `aliases.ui` plus `compilerOptions.paths`. If you
use relative imports instead, import from the generated path:

```tsx
import { Button } from "./components/ui/button";
```

## Usage

```tsx
"use client";

import { Button } from "@/components/ui/button";

export function DeleteProject({ onConfirm }: { onConfirm: () => void }) {
  return (
    <Button variant="danger" onClick={onConfirm}>
      Delete project
    </Button>
  );
}
```

In the Next.js App Router, event handlers require a Client Component. Add
`"use client"` at the top of the file that uses interactive props; purely
visual buttons can stay server-rendered.

## Forms

`Button` defaults to `type="button"`, so it does not submit a form unless you
ask it to:

```tsx
<form action={save}>
  <Button type="submit">Save</Button>
  <Button variant="ghost" type="reset">
    Reset
  </Button>
</form>
```

## Props

```tsx
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "link";
  size?: "sm" | "md" | "lg" | "icon";
  fullWidth?: boolean;
}
```

All native attributes are forwarded. See [Components](/docs/components) for
variant and size guidance.

## Styling

The component uses standard Tailwind utilities. Pass `className` to extend it:

```tsx
<Button className="rounded-full">Pill</Button>
```

## Type checking

The installed file is plain TypeScript with no imports beyond `react` types, so
it type-checks under `strict` mode. If your project does not use the automatic
JSX runtime, configure `"jsx": "react-jsx"` in `tsconfig.json`.

## Testing

Render with your preferred test runner. A minimal React Testing Library check:

```tsx
render(<Button variant="danger">Delete</Button>);
expect(screen.getByRole("button", { name: "Delete" })).toHaveClass("bg-red-600");
```
