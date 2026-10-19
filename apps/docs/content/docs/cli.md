---
title: CLI
description: Commands, flags, exit codes, and the safety model behind file writes.
order: 3
---

# CLI

The `openui` CLI initializes projects, installs components, inspects the
registry, and builds or validates registries.

```bash
openui <command> [options]
```

Global options work with every command:

| Option        | Description                                 |
| ------------- | ------------------------------------------- |
| `--cwd <dir>` | Run as if the process started in `<dir>`.   |
| `--help`      | Show help. Use `openui help <command>` too. |
| `--version`   | Print the CLI version.                      |

## `openui init`

Writes `openui.json`.

```bash
openui init
openui init --framework vue --css src/app.css --no-typescript
```

| Option                                          | Description                       |
| ----------------------------------------------- | --------------------------------- |
| `--framework <react\|svelte\|astro\|vue\|auto>` | Override detection.               |
| `--typescript` / `--no-typescript`              | Choose the target language.       |
| `--registry <url-or-path>`                      | Registry location.                |
| `--css <path>`                                  | Tailwind entry file.              |
| `--components-alias <path>`                     | Shared components alias.          |
| `--ui-alias <path>`                             | UI primitives alias.              |
| `--force`                                       | Overwrite an existing config.     |
| `--yes`                                         | Accept prompts non-interactively. |

Refuses to overwrite without `--force` (or a confirmed prompt).

## `openui add <component…>`

Installs one or more components, including registry dependencies.

```bash
openui add button
openui add input textarea select checkbox radio label field
openui add button --dry-run
openui add button --overwrite
```

| Option                             | Description                        |
| ---------------------------------- | ---------------------------------- |
| `--dry-run`                        | Print the plan; write nothing.     |
| `--overwrite`                      | Replace existing files.            |
| `--yes`                            | Accept prompts non-interactively.  |
| `--framework <name>`               | Override the configured framework. |
| `--typescript` / `--no-typescript` | Override the configured language.  |
| `--registry <url-or-path>`         | Override the configured registry.  |
| `--config <path>`                  | Use a specific `openui.json`.      |

Existing files are skipped and reported unless `--overwrite` is passed.
Registry targets containing `..` are rejected, so an item can never write
outside the project root.

## `openui list`

Lists components in the configured registry.

```bash
openui list
openui list --json
```

`--json` prints the raw registry index for scripts.

## `openui diff <component>`

Compares installed files with the registry and reports `missing`, `in-sync`, or
`modified`, with a compact line diff for modified text files. Use it before
upgrading a component you have customized locally.

## `openui validate`

Validates `openui.json`, the registry index, and — for filesystem registries —
every referenced item and target. Remote registries validate their index
locally; items are validated when installed.

```bash
openui validate
```

This is the command to run in CI.

## `openui build`

Maintainer command. Reads `registry/openui-registry.json` at the repository
root, inlines sources from `packages/<framework>/src`, generates JSX siblings
for React TypeScript sources, and writes `registry/index.json` plus
`registry/r/*.json`.

```bash
openui build
```

It prunes generated items that are no longer referenced, so the output is
reproducible and reviewable. See [Registry](/docs/registry).

## Exit codes

| Code | Meaning                                              |
| ---- | ---------------------------------------------------- |
| `0`  | Success.                                             |
| `1`  | Validation, configuration, registry, or usage error. |

Errors are printed to stderr with a suggested next step where possible.
Unknown options and commands fail rather than being ignored.

## Safety model

1. Load and validate configuration before touching disk.
2. Fetch and validate every registry item.
3. Expand targets and reject path escapes.
4. Compute a write plan (`create`, `overwrite`, `skip`).
5. Apply the plan, honoring `--dry-run` and `--overwrite`.

No command mutates `openui.json` except `init`, and `init` never silently
replaces an existing file.
