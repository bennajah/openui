# Agent instructions

This repository is the OpenUI monorepo. Start with `README.md` for the product
and contributor workflow, then load the skill that matches the task.

## Skills

| Task                                                  | Skill                                          |
| ----------------------------------------------------- | ---------------------------------------------- |
| Repository structure, package boundaries, config flow | `.agents/skills/openui-architecture/SKILL.md`  |
| Component APIs, framework parity, styling             | `.agents/skills/openui-components/SKILL.md`    |
| Registry manifest, targets, generation, serving       | `.agents/skills/openui-registry/SKILL.md`      |
| CLI commands, flags, write safety, exit codes         | `.agents/skills/openui-cli/SKILL.md`           |
| Tests, fixtures, component compilers, verify          | `.agents/skills/openui-testing/SKILL.md`       |
| Docs pages, LLM files, schema, docs site              | `.agents/skills/openui-documentation/SKILL.md` |
| Changesets, beta versions, publishing                 | `.agents/skills/openui-releases/SKILL.md`      |

## Non-negotiables

1. Only `openui.json` is supported; never add a JS/TS config file.
2. Installed components must not import `@openui/*` or any third-party runtime
   package.
3. Never hand-edit generated files: `registry/index.json`, `registry/r/*.json`,
   `apps/docs/public/schema.json`, `apps/docs/public/llms*`, or
   `apps/docs/public/registry/`.
4. Canonical sources are `packages/*/src`, `registry/openui-registry.json`, and
   `apps/docs/content/docs`.
5. Run `bun run verify` before declaring work complete. Report real command
   results, not expectations.
6. Every public package change needs a changeset. Publishing is manual.
7. Do not commit secrets, build output, `node_modules`, or the generated
   `apps/docs/public/registry/` copy.

## Quick commands

```bash
bun install
bun run dev
bun test
bun run verify
bun run format
bun run lint
bun run registry:build
bun run llms:generate
```
