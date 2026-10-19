---
name: openui-testing
description: Use when adding or changing tests, debugging a failing OpenUI check, or deciding which layer a regression test belongs to. Covers Bun tests, temporary-project fixtures, component compile/render tests, integration installs, and the verify workflow.
---

# OpenUI testing

## When to use this skill

- Adding behavior and needing a regression test.
- Choosing between a unit, component, or integration test.
- Debugging `bun test` or `bun run verify` failures.
- Changing test helpers or generated-artifact checks.

## Commands

```bash
bun test                     # every workspace test
bun test packages/cli        # one package
bun test packages/cli/test/add.test.ts
bun run verify               # authoritative gate
```

`bun run verify` runs, in order, and fails fast:

1. `oxfmt --check`
2. `oxlint .`
3. `bun run typecheck`
4. `bun test`
5. `bun run schema:generate`
6. `bun run registry:build`
7. `bun run registry:validate`
8. `bun run llms:generate`
9. `bun run llms:validate`
10. `bun run registry:public`
11. `bun run build:docs`

Steps 5–10 rewrite generated files. If `verify` leaves `git status` dirty,
generated output was stale: commit the regenerated files.

## Where tests live

| Area               | Location                              | Assert about                                    |
| ------------------ | ------------------------------------- | ----------------------------------------------- |
| Config, detection  | `packages/core/test`                  | validation, defaults, aliases, framework detect |
| Registry contracts | `packages/core/test/registry.test.ts` | index/item validation                           |
| CLI behavior       | `packages/cli/test`                   | args, commands, writes, exit behavior           |
| Components         | `packages/<framework>/test`           | compiled markup and rendered output             |
| LLM docs           | `apps/docs/test/llms.test.ts`         | completeness, staleness, links                  |

Add tests next to the layer that owns the behavior. Prefer a unit test for pure
logic and one integration test for the end-to-end path.

## CLI fixtures

Use `packages/cli/test/helpers.ts`:

```ts
import { createProject, createRegistry, makeTempDir } from "./helpers.ts";

const root = createProject({ framework: "svelte", typescript: false });
const registry = createRegistry(root);
```

- `makeTempDir()` creates a directory under the OS temp directory.
- `createProject(overrides)` writes a valid `openui.json`.
- `createRegistry(root)` writes a minimal local registry with one item per
  framework, including a React JSX sibling.
- Never write inside the repository from a test.
- Never assert on absolute temp paths; assert on relative destinations or
  `existsSync` against the temp root.

Test the `runX` function directly for logic. Spawn the CLI only when testing
process behavior (dispatch, help, exit codes) — see `cli.test.ts`.

## Component tests

Each framework uses its native compiler:

- **React** — `react-dom/server` render to markup, plus a TypeScript compile.
- **Svelte** — `svelte/compiler` compile; assert compile succeeds and expected
  markup is produced.
- **Astro** — `@astrojs/compiler-rs` transform; assert no diagnostics.
- **Vue** — `@vue/compiler-sfc` parse/compile plus `@vue/server-renderer`.

Assert on semantics (role, text, classes containing the variant) rather than
full markup snapshots. A snapshot that includes whitespace makes unrelated
formatting changes fail.

## Real-registry integration

`packages/cli/test/registry.test.ts` builds the repository registry in a temp
directory and installs the real components into React, Svelte, Astro, and Vue
(plus the React JSX variant). This is the test that catches manifest/target
drift. Keep it using the real `registry/openui-registry.json` and real component
sources; do not replace it with fixtures.

## Generated artifacts

Do not test generated JSON as a literal. Test the invariants:

- every manifest target exists and is non-empty;
- every index entry resolves to an item with the same name and framework;
- generated files are byte-identical across two builds (determinism);
- `validateLlms` returns no errors.

## Writing a regression test

1. Reproduce the bug in a failing test at the lowest layer that can observe it.
2. Fix the code, not the assertion.
3. Run the package tests, then `bun run verify`.
4. If the fix changes generated output, include the regenerated files in the
   same commit.

## Pitfalls

- Tests that depend on `process.cwd()` fail when Bun runs from another
  workspace. Pass explicit roots or use `makeTempDir`.
- `bun test` discovers tests in all workspaces; a test that mutates a shared
  file will break other packages.
- Framework compilers emit warnings that are not failures; assert on errors
  explicitly.
- `verify` builds docs, so a broken Markdown link or stale LLM file shows up as
  a docs build failure, not a test failure.
- Never skip a failing test to get a green `verify`.
