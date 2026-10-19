# Changesets

This directory holds [Changesets](https://github.com/changesets/changesets)
state for the OpenUI monorepo.

- `config.json` — committed configuration (public access, `main` base branch,
  `@openui/docs` ignored).
- `pre.json` — committed pre-release mode (`beta`). Versions look like
  `0.1.0-beta.0`.
- `<name>.md` — pending changeset entries. These are committed and consumed by
  `bun run version-packages`.
- `*.json` other than the two above is CLI state and is gitignored.

## Workflow

```bash
bun run changeset          # add a changeset for public package changes
bun run version-packages   # consume changesets, bump versions, write changelogs
bun run verify             # regenerate registry/schema/docs, run every check
bun run release            # changeset publish (manual, intentional)
```

Public packages are versioned together: `@openui/core`, `@openui/cli`,
`@openui/react`, `@openui/svelte`, `@openui/astro`, `@openui/vue`. The
`@openui/docs` workspace is private and ignored.

See `.agents/skills/openui-releases/SKILL.md` for the release checklist.
