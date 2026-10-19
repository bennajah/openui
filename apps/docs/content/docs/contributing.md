---
title: Contributing
description: Repository layout, local workflow, verification, changesets, and known beta limitations.
order: 7
---

# Contributing

OpenUI is a Bun monorepo. Component sources are canonical; the registry and
documentation are generated from them.

## Layout

```
packages/core        Config schema, validation, framework detection, registry contracts
packages/cli         The `openui` command
packages/react       Canonical React sources
packages/svelte      Canonical Svelte sources
packages/astro       Canonical Astro sources
packages/vue         Canonical Vue sources
registry/            Manifests (hand-written) + generated index/items
apps/docs            Astro documentation site and generated LLM docs
scripts/             Verification, schema, and LLM docs generators
.agents/skills/      Instructions for coding agents working in this repo
```

## Setup

```bash
bun install
bun run verify
```

`verify` is the single command that must pass before a pull request. It runs
formatting, linting, type checks, tests, registry generation and validation,
schema and LLM docs generation, and a production docs build.

## Formatter and linter

The project uses the **oxc toolchain**:

- `oxfmt` for formatting (TypeScript, JavaScript, JSON, CSS, Markdown, and
  framework files through its bundled Prettier support);
- `oxlint` for linting JavaScript and TypeScript.

There is no separate "Cox" formatter or linter package on npm. The original
request referred to this toolchain; the names `oxfmt`/`oxlint` are used in
documentation so contributors can find the real packages. Configuration lives
in `oxfmt.json` and `.oxlintrc.json`.

**Known limitation:** `oxlint` does not lint `.svelte`, `.astro`, or `.vue`
component files. Those files are covered by compiler tests in each framework
package (`svelte/compiler`, `@astrojs/compiler-rs`, `vue/compiler-sfc`), which
fail on syntax and template errors.

Commands:

```bash
bun run format        # write formatting
bun run format:check  # verify formatting
bun run lint          # lint JS/TS
bun run lint:fix      # apply safe lint fixes
```

## Tests

```bash
bun test
```

Tests live next to the code they cover:

- `packages/core/test` — config validation, detection, registry contracts.
- `packages/cli/test` — argument parsing, commands, safety behavior, and
  cross-framework installs against a generated registry.
- `packages/<framework>/test` — component behavior or compilation.
- `apps/docs/test` — LLM documentation validation.

Add a regression test with every behavior change. CLI tests use temporary
directories and never touch the repository.

## Documentation

Documentation pages are canonical Markdown in `apps/docs/content/docs` and
`apps/docs/content/docs/frameworks`. The LLM-friendly copies under
`apps/docs/public/llms*` are generated:

```bash
bun run llms:generate
bun run llms:validate
```

Do not edit generated files by hand. Update the Markdown source and regenerate.
When you add a page, also add it to the required page list in
`scripts/validate-llms.ts` if it must always exist.

## JSON Schema

`apps/docs/public/schema.json` is generated from the core config schema:

```bash
bun run schema:generate
```

Never hand-edit the schema; change `packages/core/src/config/schema.ts` first.

## Changesets

Every user-facing change needs a changeset:

```bash
bun run changeset
```

Choose the affected packages and a bump type, and describe the change for the
changelog. The repository is in Changesets pre-release mode for the beta, so
versions look like `0.1.0-beta.0`. Publishing is manual:

```bash
bun run version-packages
bun run registry:build
bun run verify
bun run release
```

See `.changeset/config.json`. `@openui/docs` is private and ignored.

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(components): add badge
fix(cli): reject empty component names
docs: explain alias resolution
chore: bump oxfmt
```

Keep commits focused. Run `bun run verify` before pushing.

## Beta limitations

- The CLI runs on Bun and ships TypeScript sources; a Node-compatible build is
  planned before the first stable release.
- Component packages publish source files, not compiled distributions.
- `oxlint` does not lint framework component files (see above).
- Tailwind class prefixes are configured but not rewritten in component
  sources.
- The registry is committed and served statically from the docs deployment.
