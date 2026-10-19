---
name: openui-registry
description: Use when modifying registry manifests, registry items, target tokens, build output, or registry validation/serving. Covers the generated-vs-canonical contract and how to add or version items safely.
---

# OpenUI registry

## When to use this skill

- Adding a component source to the registry.
- Changing target templates or adding a token.
- Debugging `openui build`, `openui validate`, or install failures.
- Serving or versioning the registry.

## Canonical vs generated

| Path                            | Status    | Produced by                       |
| ------------------------------- | --------- | --------------------------------- |
| `registry/openui-registry.json` | canonical | hand-edited                       |
| `packages/*/src/*`              | canonical | hand-edited                       |
| `registry/index.json`           | generated | `openui build`                    |
| `registry/r/*.json`             | generated | `openui build`                    |
| `apps/docs/public/registry/`    | generated | `scripts/sync-registry-public.ts` |

Never hand-edit generated files. The build overwrites them and prunes stale
items.

## Manifest shape

```json
{
  "name": "openui",
  "version": "0.1.0-beta.0",
  "homepage": "https://openuii.vercel.app",
  "output": "registry",
  "components": [
    {
      "name": "button",
      "title": "Button",
      "description": "…",
      "meta": { "variant": [], "size": [], "props": [] },
      "sources": {
        "react": [
          {
            "path": "packages/react/src/button.tsx",
            "target": "{ui}/button.tsx",
            "type": "component",
            "languageVariants": true
          }
        ]
      }
    }
  ]
}
```

- `name` must be lowercase kebab-case.
- `version` must be semver and should match the package versions being shipped.
- `type` is `component`, `lib`, or `css`.
- `languageVariants` only applies to `.tsx` targets; it generates a `.jsx`
  sibling.
- Every `path` must exist and be non-empty, or the build fails.

## Build pipeline

`bun run registry:build` (which runs the CLI shim) does:

1. Reads the manifest from the repository root.
2. For each component × framework, inlines source content.
3. Generates JSX variants with `ts.transpileModule` (JSX preserved, ESNext).
4. Validates each item with `validateRegistryItem`.
5. Validates the index with `validateRegistryIndex`.
6. Writes deterministic JSON and removes unreferenced `r/*.json`.

The CLI executable is `packages/cli/bin/openui.js`. Root scripts invoke it
directly; `packages/cli/src/index.ts` is a side-effect-free export module.

## Target tokens

| Token          | Expands to                              |
| -------------- | --------------------------------------- |
| `{ui}`         | resolved `aliases.ui` directory         |
| `{components}` | resolved `aliases.components` directory |
| `{css}`        | directory of `tailwind.css`             |

Targets are project-root relative. The CLI rejects any target containing `..`,
even if the resolved path would stay inside the project. When adding a token,
update `TARGET_TOKENS` in `packages/core/src/config/types.ts`, alias expansion
in `packages/core/src/config/aliases.ts`, both CLI commands that expand targets
(`add`, `validate`, `diff`), and the docs.

## Validation

```bash
bun run registry:validate
```

For filesystem registries it fetches every item referenced by the index, checks
name/framework consistency, and expands every target. For HTTP registries only
the index is validated locally; items are validated at install time.

Always run after changing component sources or the manifest:

```bash
bun run registry:build && bun run registry:validate && bun test
```

The integration test in `packages/cli/test/registry.test.ts` builds the real
registry in a temp directory and installs the real Button into all four
frameworks. It catches manifest and target regressions.

## Serving

The docs build copies `registry/` to `apps/docs/public/registry/`, so the
deployed site serves `https://openuii.vercel.app/registry/index.json` and
`https://openuii.vercel.app/registry/r/*.json`. The CLI default is
`https://openuii.vercel.app/registry`.

## Versioning

1. Add a changeset (`bun run changeset`).
2. Run `bun run version-packages` (pre mode tag: beta).
3. Update the manifest `version` to match the released package version.
4. Rebuild, validate, and commit generated output with the release.

## Pitfalls

- A source that imports a package makes the item non-self-contained.
- A manifest target outside `{ui}`/`{components}`/`{css}` may break alias
  resolution.
- Running `openui build` from a subdirectory fails: it requires the repository
  root manifest.
- `registry/r/` is intentionally committed for static serving; do not add it to
  `.gitignore`.
- `apps/docs/public/registry/` is generated and ignored; do not edit it.
