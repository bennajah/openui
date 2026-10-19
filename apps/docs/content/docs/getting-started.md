---
title: Getting started
description: Install OpenUI, initialize a project, and add your first component.
order: 1
---

# Getting started

OpenUI installs framework-native components as source files. There is no
runtime package, no provider, and no version lock-in: once a component is in
your project, it is your code.

## Requirements

- [Bun](https://bun.sh) 1.1 or newer (the beta CLI runs on Bun).
- Tailwind CSS v4 in the target project.
- One of React 18+, Svelte 5, Astro 5+, or Vue 3.3+.

> The beta ships TypeScript sources directly. A Node-compatible build is
> planned before the first stable release. See [Contributing](/docs/contributing)
> for the current limitations.

## Install the CLI

```bash
bun add -g @openui/cli
```

Or run it without installing:

```bash
bunx @openui/cli --help
```

## Initialize your project

Run `init` from the project root:

```bash
openui init
```

The command detects your framework from `package.json` and writes
[`openui.json`](/docs/configuration). If detection is inconclusive it writes
`"framework": "auto"` and tells you to choose one:

```bash
openui init --framework svelte --css src/app.css
```

## Add a component

```bash
openui add button
```

The CLI reads the registry, resolves the right item for your framework and
language, and writes the component into `src/components/ui`. Existing files are
never replaced unless you pass `--overwrite`. Use `--dry-run` first when you
want to see the plan:

```bash
openui add button --dry-run
```

## Use it

### React

```tsx
import { Button } from "@/components/ui/button";

export function SaveBar() {
  return <Button type="submit">Save changes</Button>;
}
```

### Svelte

```svelte
<script>
  import Button from "$lib/components/ui/button.svelte";
</script>

<Button variant="secondary">Save changes</Button>
```

### Astro

```astro
---
import Button from "../components/ui/button.astro";
---

<Button type="submit">Save changes</Button>
```

### Vue

```vue
<script setup>
import Button from "@/components/ui/button.vue";
</script>

<template>
  <Button variant="secondary">Save changes</Button>
</template>
```

## Verify the setup

```bash
openui validate
```

This checks `openui.json`, the registry index, every referenced item, and that
each install target stays inside your project. Run it in CI.

## Next steps

- Read [Configuration](/docs/configuration) for every `openui.json` field.
- Learn the [CLI](/docs/cli) and its safety guarantees.
- Browse the [Button](/docs/components) API.
- Set up [theming](/docs/theming) with Tailwind CSS v4.
