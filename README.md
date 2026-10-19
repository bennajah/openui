# OpenUI

Framework-native UI components installed as source. No runtime package, no
provider, no version lock-in — once a component is in your project, it is your
code.

OpenUI supports **React 18+**, **Svelte 5**, **Astro 5+**, and **Vue 3.3+**, with
Tailwind CSS v4 for styling. Components are distributed through a registry and
installed by the `openui` CLI, which writes plain framework files into your
project.

```bash
bunx @openui/cli init
bunx @openui/cli add button input field
```

> **Beta.** The CLI runs on Bun and packages ship TypeScript sources directly.
> A Node-compatible build and compiled package output are planned before the
> first stable release. See [Beta limitations](#beta-limitations).

## Requirements

- [Bun](https://bun.sh) 1.1 or newer for the beta CLI.
- Tailwind CSS v4 in the target project.
- React 18+, Svelte 5, Astro 5+, or Vue 3.3+.

## Quick start

```bash
# Install the CLI globally, or use `bunx @openui/cli` per command
bun add -g @openui/cli

# Detect the framework and write openui.json
openui init

# Preview, then install
openui add button --dry-run
openui add button input textarea select checkbox radio label field
```

`init` detects React, Svelte, Astro, or Vue from dependencies and framework
files. Override it when detection is ambiguous:

```bash
openui init --framework svelte --css src/app.css
```

Installed components go to `aliases.ui` from `openui.json` (default
`src/components/ui`). Existing files are skipped unless you pass `--overwrite`.

```tsx
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function SignInForm() {
  return (
    <form>
      <Field label="Email" hint="We never share it.">
        {({ controlProps }) => <Input type="email" {...controlProps} />}
      </Field>
      <Button type="submit">Save changes</Button>
    </form>
  );
}
```

The beta ships eight components: `button`, `input`, `textarea`, `select`,
`checkbox`, `radio`, `label`, and `field`. The Button supports `variant`
(`primary`, `secondary`, `outline`, `ghost`, `danger`, `link`), `size` (`sm`,
`md`, `lg`, `icon`), `fullWidth`, and native `type`. Each framework has an
idiomatic equivalent of the same API.

## Commands

| Command                   | Purpose                                                       |
| ------------------------- | ------------------------------------------------------------- |
| `openui init`             | Detect the framework and write `openui.json`.                 |
| `openui add <component…>` | Install components and their registry dependencies.           |
| `openui list [--json]`    | List components in the configured registry.                   |
| `openui diff <component>` | Compare installed files with the registry.                    |
| `openui validate`         | Validate config, index, items, and install targets.           |
| `openui build`            | Maintainer: rebuild `registry/index.json` and `registry/r/*`. |

Global flags: `--cwd <dir>`, `--help`, `--version`. `add` also accepts
`--dry-run`, `--overwrite`, `--framework`, `--typescript`/`--no-typescript`,
`--registry`, and `--config`.

Unknown commands and flags exit with code `1`. Registry targets containing `..`
are rejected, so an item can never write outside the project root.

## Configuration

OpenUI uses exactly one file: **`openui.json`**. There is no
`openui.config.ts` and no JavaScript config API, so the file is readable by
humans, CI, editors, and the published JSON Schema at
`https://openui.dev/schema.json`.

```json
{
  "$schema": "https://openui.dev/schema.json",
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
    "url": "https://openui.dev/registry"
  }
}
```

| Field                | Default                       | Notes                                                         |
| -------------------- | ----------------------------- | ------------------------------------------------------------- |
| `framework`          | `"auto"`                      | `react`, `svelte`, `astro`, `vue`, or `auto` detection.       |
| `typescript`         | `true`                        | React installs `.tsx` or `.jsx`; other frameworks use JSDoc.  |
| `tailwind.css`       | `src/styles/global.css`       | Project-root relative path to the Tailwind entry file.        |
| `tailwind.prefix`    | `""`                          | Recorded, but not rewritten in component sources during beta. |
| `aliases.components` | `@/components`                | Shared component alias.                                       |
| `aliases.ui`         | `@/components/ui`             | Where registry targets (`{ui}`) install.                      |
| `registry.url`       | `https://openui.dev/registry` | HTTPS registry or filesystem path.                            |

Config discovery walks up from the current directory, like Git. Paths in the
file resolve relative to the project root, not the current working directory.
CLI flags override values for one invocation and never rewrite the file. Unknown
fields produce a warning and are preserved; `init` only writes config, and it
refuses to overwrite an existing file without `--force` or confirmation.

Full reference: [docs/configuration](https://openui.dev/docs/configuration).

## Repository development

This is a Bun monorepo.

```
packages/core        Config schema, validation, framework detection, registry contracts
packages/cli         The `openui` command
packages/react       Canonical React component sources
packages/svelte      Canonical Svelte component sources
packages/astro       Canonical Astro component sources
packages/vue         Canonical Vue component sources
registry/            Hand-written manifest + generated index/items
apps/docs            Astro docs site and generated LLM docs
scripts/             Verification, schema, registry publishing, docs generation
.agents/skills/      Task instructions for coding agents
```

### Setup

```bash
bun install
bun run dev        # docs site at http://localhost:4321
```

### Verification

```bash
bun run verify
```

This is the single gate before a pull request. It runs, in order and with
fail-fast: `oxfmt --check`, `oxlint .`, type checks, all tests, JSON Schema
generation, registry build and validation, LLM docs generation and validation,
the public registry copy, and a production docs build.

Individual commands:

```bash
bun test                 # all tests
bun run typecheck
bun run format           # write formatting
bun run format:check
bun run lint
bun run lint:fix
bun run registry:build
bun run registry:validate
bun run llms:generate
bun run llms:validate
bun run build            # full production build
```

Tests use Bun's built-in runner. CLI tests create isolated projects under the OS
temporary directory and never write inside the repository. The registry
integration test builds the real registry and installs the real components into
all four frameworks.

### Formatter and linter

The project uses the **oxc toolchain**: `oxfmt` for formatting and `oxlint` for
JavaScript/TypeScript linting. ("Cox" is not a published formatter/linter; the
name refers to this toolchain.) Configuration lives in `oxfmt.json` and
`.oxlintrc.json`.

Known limitation: `oxlint` does not lint `.svelte`, `.astro`, or `.vue` files.
Those are covered by their native compiler tests, which fail on syntax and
template errors.

### Documentation

Canonical pages live in `apps/docs/content/docs/**/*.md`. The LLM-friendly
files under `apps/docs/public/llms*` and the JSON Schema are generated — never
edit them by hand.

```bash
bun run llms:generate    # rebuild llms.txt, llms-full.txt, llms/**
bun run llms:validate    # completeness, staleness, links, secrets
bun run schema:generate
bun run registry:public  # copy registry/ into the docs site
```

When adding a page, add it to `REQUIRED_SLUGS` in `scripts/lib/docs.ts` if it
must always exist, regenerate, and commit the canonical and generated files
together. The docs site serves:

- `/llms.txt` — compact index for agents
- `/llms-full.txt` — every page in one file
- `/llms/<slug>.md` — one file per page
- `/schema.json` — `openui.json` JSON Schema
- `/registry/index.json` and `/registry/r/*.json` — the live registry

### Contributing

1. Create a branch and make a focused change.
2. Add or update tests next to the affected layer.
3. Update canonical docs for user-facing changes.
4. Add a changeset for every public package change: `bun run changeset`.
5. Run `bun run verify`.
6. Commit with [Conventional Commits](https://www.conventionalcommits.org/):
   `feat(components): add badge`, `fix(cli): reject empty names`.
7. Open a pull request describing behavior and verification.

Use the skills in `.agents/skills/` when working with a coding agent; they
capture the repository contracts for architecture, components, registry, CLI,
tests, docs, and releases.

### Releases

Releases use [Changesets](https://github.com/changesets/changesets) in beta
pre-release mode (`.changeset/pre.json`, tag `beta`). Publishing is manual and
must be intentional:

```bash
bun run changeset          # describe the change and choose bump types
bun run version-packages   # consume changesets, bump versions + changelogs
bun run registry:build     # update the registry manifest version and items
bun run verify
bun run release            # changeset publish — manually triggered only
```

Public packages (`@openui/core`, `@openui/cli`, `@openui/react`,
`@openui/svelte`, `@openui/astro`, `@openui/vue`) are versioned together. The
private `@openui/docs` package is ignored. See `.agents/skills/openui-releases`
for the full checklist.

## Design principles

- **Source, not runtime.** Components are copied into your project and depend on
  nothing from OpenUI at runtime.
- **Framework-native.** Each implementation uses its framework's idioms rather
  than wrapping a cross-framework runtime.
- **Zero runtime dependencies.** No `clsx`, `cva`, or `tailwind-merge` inside
  installed components; variants are disjoint, so merging is unnecessary.
- **One configuration file.** Plain JSON with a published schema, validated with
  actionable errors.
- **Safe writes.** Plan, dry-run, then apply. Skip existing files by default and
  never write outside the project root.
- **Generated artifacts are reproducible.** Registry, schema, and LLM docs are
  built from canonical sources and validated for staleness.

## Beta limitations

- The CLI requires Bun; a Node-compatible distribution is planned.
- Packages publish TypeScript/SFC sources, not compiled distributions.
- `oxlint` does not lint `.svelte`, `.astro`, or `.vue` files (compiler tests
  cover them).
- Tailwind class prefixes are configured but not rewritten in component sources.
- The beta ships eight components (`button`, `input`, `textarea`, `select`,
  `checkbox`, `radio`, `label`, `field`); the registry and CLI support more.
- The registry is committed and served statically from the docs deployment.

## License

MIT — see [LICENSE](./LICENSE).
