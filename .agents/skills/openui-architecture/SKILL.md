---
name: openui-architecture
description: Use when changing repository structure, package boundaries, configuration flow, or cross-package contracts in the OpenUI monorepo. Explains what is canonical, what is generated, and which package may depend on which.
---

# OpenUI architecture

## When to use this skill

- Adding a package, workspace, or framework.
- Moving logic between `core`, `cli`, framework packages, or the docs site.
- Changing `openui.json`, registry contracts, or generated artifacts.
- Reviewing a change for boundary violations.

## Ground rules

1. **One config filename: `openui.json`.** No `openui.config.ts`, no JS config
   API. The schema is canonical in `packages/core/src/config/schema.ts`.
2. **`@openui/core` has zero runtime dependencies** and never depends on a
   framework, the CLI, or the docs site. It is tooling-only: types, validation,
   detection, registry contracts.
3. **`@openui/cli` may depend on `@openui/core` and `typescript`** (build-time
   TSX → JSX transpilation). Nothing else.
4. **Framework packages are source registries, not runtime libraries.**
   `packages/<framework>/src` holds canonical component sources. Installed
   components must not import `@openui/*` or any third-party runtime package.
5. **Generated files are never hand-edited:**
   - `registry/index.json`, `registry/r/*.json` ← `openui build`
   - `apps/docs/public/schema.json` ← `scripts/generate-schema.ts`
   - `apps/docs/public/llms*` ← `scripts/generate-llms.ts`
   - `apps/docs/public/registry/` ← `scripts/sync-registry-public.ts`
6. **Canonical sources:**
   - config + registry types/validation: `packages/core/src`
   - components: `packages/<framework>/src`
   - docs: `apps/docs/content/docs`
   - registry manifest: `registry/openui-registry.json`

## Dependency direction

```
packages/core  ←  packages/cli
     ↑                 ↑
     └── contracts     └── reads registry manifest + component sources
packages/<framework>  (no dependencies; consumed by the registry builder)
apps/docs             (depends on @openui/astro only for workspace tooling;
                       content is plain Markdown)
scripts/*             (may import packages/core sources directly)
```

`scripts/*` imports core with a relative path (`../packages/core/src/index.ts`)
because the repository root has no `@openui/core` dependency.

## Configuration flow

1. `loadConfig` discovers `openui.json` upward from `cwd` (or accepts
   `--config`).
2. `validateConfig` applies defaults, warns about unknown fields, and returns
   a typed config.
3. `applyOverrides` layers CLI flags for one invocation. Flags never rewrite
   the file.
4. `init` is the only command that writes config, and only with consent.

Paths (`tailwind.css`, registry filesystem paths, aliases) always resolve
relative to the **project root** (directory containing `openui.json`), not the
current working directory.

## Adding a framework

1. Create `packages/<framework>` with `package.json`, `tsconfig.json`, and
   `src/index.ts` (metadata) plus native component sources.
2. Add the name to `FRAMEWORK_NAMES` in `packages/core/src/config/types.ts` and
   to detection in `packages/core/src/framework/detect.ts`.
3. Extend registry validation if the file extension is new.
4. Add manifest sources and `languageVariants` rules in
   `registry/openui-registry.json`.
5. Add compile/render tests in the package.
6. Update CLI language-selection tests and docs (`frameworks/<name>.md` plus
   `REQUIRED_SLUGS` in `scripts/lib/docs.ts`).
7. Regenerate everything and run `bun run verify`.

## Verification

```bash
bun run format:check
bun run lint
bun run typecheck
bun test
bun run verify
```

## Pitfalls

- Importing `@openui/core` from an installed component breaks the zero-dependency
  guarantee.
- Writing install targets relative to `cwd` instead of the config root creates
  files in the wrong place in monorepos.
- Editing generated registry JSON by hand is overwritten on the next build.
- Adding a framework to the registry manifest without updating
  `FRAMEWORK_NAMES` fails validation.
- `scripts/*` must not use a bare `@openui/core` import.
