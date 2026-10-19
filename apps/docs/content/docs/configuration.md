---
title: Configuration
description: Every field in openui.json, how discovery works, and how CLI flags interact with the file.
order: 2
---

# Configuration

OpenUI uses exactly one configuration file: **`openui.json`**. There is no
`openui.config.ts` and no JavaScript configuration API, so the same file is
readable by humans, CI, editors, and the JSON Schema at
`https://openuii.vercel.app/schema.json`.

## Example

```json
{
  "$schema": "https://openuii.vercel.app/schema.json",
  "framework": "auto",
  "typescript": true,
  "tailwind": {
    "css": "src/styles/global.css",
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "ui": "@/components/ui"
  },
  "registry": {
    "url": "https://openuii.vercel.app/registry"
  }
}
```

## Fields

### `$schema`

Optional. Points editors at the JSON Schema for autocomplete and validation.
`openui init` writes the canonical URL.

### `framework`

One of `"react"`, `"svelte"`, `"astro"`, `"vue"`, or `"auto"`.

- `"auto"` (default) detects the framework from dependencies and telltale files.
- An explicit value always wins and disables detection.

Detection reads `package.json` dependencies in order of evidence strength,
then checks for framework files such as `src/App.svelte`, `src/App.vue`, or
`src/pages`. If nothing is conclusive, commands that need a framework fail with
an actionable error telling you to set the field or pass `--framework`.

### `typescript`

Boolean. `true` (default) installs TypeScript variants (`.tsx`, typed props).
`false` installs JavaScript variants where they exist.

React items ship both `.tsx` and `.jsx` files; the CLI picks one. Svelte,
Astro, and Vue sources are written in plain JavaScript with JSDoc types so the
same file works in both TypeScript and JavaScript projects. This is why those
framework sources avoid `lang="ts"`.

### `tailwind.css`

Path to the project's global Tailwind CSS entry file, relative to the project
root. Used to place CSS artifacts and to render accurate guidance.

### `tailwind.prefix`

Optional Tailwind class prefix, for example `"tw-"`. Use `""` for no prefix.
The prefix is not rewritten in component sources during the beta; components
assume an un-prefixed setup.

### `aliases.components`

The import alias for your shared component directory.

### `aliases.ui`

The import alias for installed OpenUI primitives. Registry targets use the
`{ui}` token, which expands to this directory.

Aliases are resolved in this order:

1. `compilerOptions.paths` from `tsconfig.json` or `jsconfig.json`,
   including wildcard entries such as `"@/*": ["./src/*"]`.
2. The common `@/` → `src/` convention.

Paths are always interpreted relative to the **project root** — the directory
containing `openui.json` — never relative to the current working directory.

### `registry.url`

Either an `https://` URL serving `index.json` and `r/*.json`, or a filesystem
path (absolute, or relative to the project root). Filesystem registries are
useful for vendoring, air-gapped environments, and registry development.

## Discovery

The CLI searches for `openui.json` in the current directory and then walks up
parent directories, like Git. This lets a monorepo keep one config at the root
while packages run commands from their own directories.

An explicit `--config path` skips discovery. If that path does not exist, the
command fails instead of silently falling back to discovery.

## CLI flags

Flags override values for a single invocation **without rewriting the file**:

```bash
openui add button --framework vue --registry ./vendor/registry
```

`init` is the only command that writes configuration. It refuses to replace an
existing file unless you pass `--force` (or confirm an interactive prompt), and
it warns that unknown fields are lost when overwriting.

## Unknown fields

Unknown fields produce warnings, not errors, and are preserved in memory.
Because the file is plain JSON, deleting a field is a deliberate edit; the CLI
never rewrites your config to normalize it.

A misspelled field gets a suggestion:

```
Unknown field "tailwind.cs". Did you mean "tailwind.css"? Preserved but ignored.
```

## Validation

`openui validate` checks the config and the configured registry. `openui init`
validates the config it generates before writing it, so it cannot create an
invalid file by construction.
