---
name: openui-cli
description: Use when changing the openui CLI, adding commands or flags, or debugging install/validation behavior. Covers argument parsing, run functions, write safety, exit codes, and tests.
---

# OpenUI CLI

## When to use this skill

- Adding or changing a command or flag.
- Fixing config discovery, alias resolution, or install destinations.
- Changing write behavior, error messages, or exit codes.
- Wiring a new command into root scripts.

## Structure

```
packages/cli/bin/openui.js        executable shim (Bun)
packages/cli/src/index.ts         side-effect-free exports
packages/cli/src/run.ts           dispatch, help, version, error handling
packages/cli/src/args.ts          argv parser + typed flag helpers
packages/cli/src/commands/*.ts    thin command wrappers + pure run* functions
packages/cli/src/registry-resolver.ts  http/filesystem fetching + validation
packages/cli/src/fsutil.ts        plan → apply write safety
packages/cli/src/tsconfig-paths.ts     tsconfig/jsconfig alias reading
packages/cli/src/ui.ts            terminal output helpers
```

Root scripts call `packages/cli/bin/openui.js`. Importing `src/index.ts` must
never execute the CLI.

## Command pattern

Each command file exports:

- an interface for options;
- a pure-ish `runX(options)` returning a discriminated result
  (`{ ok: true, … } | { ok: false, errors }`);
- a thin `xCommand(args)` that parses flags, calls `runX`, prints output, and
  returns an exit code.

Keep all decisions in `runX` so tests can call it without spawning processes.

## Adding a command

1. Implement `runFoo` and `fooCommand` in `src/commands/foo.ts`.
2. Register it in `run.ts`:
   - add to the help text;
   - add a `COMMAND_HELP` entry;
   - add allowed flags to `ALLOWED_FLAGS`;
   - add a `case` to the switch.
3. Add tests in `packages/cli/test/`.
4. Document it in `apps/docs/content/docs/cli.md` and the README.
5. Run `bun run verify`.

Unknown commands and unknown flags must fail with exit code 1, not be ignored.

## Flags

`parseArgs` supports:

- `--flag`, `--no-flag`, `--key value`, `--key=value`;
- value flags are declared in `VALUE_FLAGS`; anything else is boolean;
- the first non-flag token is the command, the rest are positionals.

`--cwd` is global. `--config` selects an explicit `openui.json` (missing file is
an error, never a silent fallback). `--registry`, `--framework`,
`--typescript`, and language flags override config for one invocation only.

## Write safety

All installs go through `planWrites` → `applyWrites`:

1. Resolve each target against the **config root**.
2. Reject targets containing `..` or resolving outside the root.
3. Classify existing files as `skip` unless `--overwrite` / `--yes`.
4. Honor `--dry-run` by not writing, and report planned paths.
5. Never delete files.

Do not call `writeFileSync` directly in a new install path; extend the plan.

## Error messages

- State what failed and where (absolute path or config-relative path).
- Suggest the next command when the fix is mechanical
  (`Run \`openui init\`…`, `pass --overwrite…`).
- Keep exit code `1` for all user errors.
- Print diagnostics to stderr (`ui.error`), normal output to stdout.

## Tests

Cover, at minimum:

- argument parsing edge cases (`args.test.ts`);
- init detection, refusal, force, and flag values (`init.test.ts`);
- add dry-run, skip, overwrite, JS/TS selection, path escape, all four
  frameworks (`add.test.ts`, `registry.test.ts`);
- list/validate/diff behavior (`commands.test.ts`);
- dispatch, help, version, unknown command (`cli.test.ts`).

Use `makeTempDir()` and `createProject()` from `test/helpers.ts`; never write
inside the repository.

```bash
bun test packages/cli
```

## Pitfalls

- Root scripts that run `src/index.ts` now do nothing; use the bin shim.
- Resolving install paths against `process.cwd()` breaks monorepo subdirectory
  usage.
- Fetching registry items sequentially is intentional (dependencies are
  discovered incrementally); keep the lint suppression comment accurate.
- Config flags must not rewrite `openui.json`.
