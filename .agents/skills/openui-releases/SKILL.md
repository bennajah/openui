---
name: openui-releases
description: Use when adding a changeset, bumping versions, preparing a beta or stable release, or changing release configuration. Covers pre-release mode, package versioning, registry version sync, and manual publishing.
---

# OpenUI releases

## When to use this skill

- A change affects published behavior and needs a changeset.
- Preparing a version bump or changelog.
- Cutting a beta or stable release.
- Changing `.changeset/config.json` or package metadata.

## Rules

1. **Every user-facing change gets a changeset.** Docs-only changes inside the
   private `@openui/docs` workspace do not need one, but docs that describe a
   changed public package ship with that package's changeset.
2. **Publishing is manual.** There is no CI publish job. `bun run release` runs
   `changeset publish` and must only be run intentionally, after review.
3. **Versions are synchronized across public packages.** `@openui/core`,
   `@openui/cli`, `@openui/react`, `@openui/svelte`, `@openui/astro`, and
   `@openui/vue` are released together at the same version.
4. **The registry version follows the packages.** Update
   `registry/openui-registry.json` `version` to match the release, rebuild, and
   commit generated output.
5. **Never commit secrets or npm tokens.** Use `npm login` or
   `NPM_TOKEN` in the environment for the publish command only.

## Current release mode

`.changeset/config.json` uses `baseBranch: main`, public access, and ignores the
private `@openui/docs` package. `.changeset/pre.json` puts the repository in
pre-release mode with tag `beta`, so versions look like `0.1.0-beta.0` and
`changeset version` increments the beta number.

`.changeset/pre.json` is committed on purpose (the rest of
`.changeset/*.json` is gitignored). Do not delete it while beta is active;
removing it switches back to stable versioning.

## Add a changeset

```bash
bun run changeset
```

Select the affected packages and bump type:

- `patch` — bug fixes, docs corrections shipped with a package.
- `minor` — new components, commands, flags, or options.
- `major` — breaking config, registry, or API changes.

Write the summary for users, not as a commit message. Good:

> Add a `size` prop to Button with `sm`, `md`, and `lg` values.

Bad:

> update button.tsx.

Or create the file directly, for example `.changeset/brave-buttons.md`:

```markdown
---
"@openui/react": minor
"@openui/svelte": minor
"@openui/astro": minor
"@openui/vue": minor
"@openui/cli": minor
"@openui/core": minor
---

Add a `size` prop to Button with `sm`, `md`, and `lg` values.
```

Use the exact package names from each `package.json`. The filename is arbitrary
and human-readable.

## Version packages

```bash
bun run version-packages   # changeset version
```

This consumes pending changesets, bumps versions, and updates changelogs. Then:

1. Update the registry manifest `version`.
2. `bun run registry:build`
3. `bun run schema:generate`
4. `bun run llms:generate`
5. `bun run verify`
6. Review and commit the version bump, changelogs, and regenerated artifacts.
7. Tag and push if the release process requires it:
   `git tag v<version> && git push origin main --tags`.

## Publish

Only after the version commit is reviewed:

```bash
bun run release   # changeset publish
```

Then verify on npm:

```bash
npm view @openui/core version
npm view @openui/cli version
npm view @openui/react version
```

If a publish partially succeeds, do not bump again. Publish the remaining
packages at the existing version, then confirm the registry version matches.

## Leaving beta

1. `bunx changeset pre exit`
2. Delete or commit the removal of `.changeset/pre.json`.
3. Run `bun run version-packages` and choose the stable version.
4. Update the registry manifest and regenerate everything.
5. Run `bun run verify`, publish, and tag.
6. Update docs that describe beta limitations.

## Release checklist

- [ ] Changesets cover every public package change.
- [ ] Package versions are identical across public packages.
- [ ] Registry manifest `version` matches.
- [ ] `registry/index.json` and `registry/r/*.json` rebuilt.
- [ ] Schema and LLM docs regenerated.
- [ ] `bun run verify` passes.
- [ ] Changelog entries read as user-facing notes.
- [ ] No secrets or tokens in the diff.
- [ ] Publish confirmed with `npm view` for each package.

## Pitfalls

- Editing package versions by hand desynchronizes packages and changesets.
- Forgetting the registry version ships an index that claims the wrong version.
- Publishing from a dirty tree can omit regenerated files.
- `changeset version` also consumes changesets in pre mode; re-add any that were
  accidentally deleted.
- `@openui/docs` is private and ignored: adding it to a changeset is a no-op,
  but including it signals a misunderstanding of the release set.
