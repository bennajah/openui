import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

/**
 * Docs-side registry reader.
 *
 * The docs site renders component code blocks from the *same* registry the CLI
 * installs from, so a documented snippet can never drift from what a user
 * actually gets.
 *
 * `apps/docs/public/registry/` is copied from the repository `registry/` by
 * `scripts/sync-registry-public.ts`, which runs at the start of the docs build
 * (`bun run build:docs`). Reading it means the docs and the served static
 * registry can never disagree. `public/` is not bundled, so this path stays
 * valid inside Vite's SSR bundle.
 */

const REGISTRY_DIR = resolve(process.cwd(), "public/registry");

export type Framework = "react" | "svelte" | "astro" | "vue";

export const FRAMEWORKS: readonly Framework[] = ["react", "svelte", "astro", "vue"];

export interface RegistryIndexEntry {
  title: string;
  description: string;
  frameworks: Partial<Record<Framework, { item: string }>>;
}

interface RegistryIndex {
  name: string;
  version: string;
  components: Record<string, RegistryIndexEntry>;
}

interface RegistryItemFile {
  path: string;
  content: string;
  target: string;
  type: string;
}

interface RegistryItem {
  name: string;
  framework: Framework;
  version: string;
  files: RegistryItemFile[];
}

const indexCache = new Map<string, RegistryIndex>();

/** The generated catalog (`registry/index.json`). */
export function readRegistryIndex(dir: string = REGISTRY_DIR): RegistryIndex {
  const cached = indexCache.get(dir);
  if (cached !== undefined) return cached;
  const index = JSON.parse(readFileSync(join(dir, "index.json"), "utf8")) as RegistryIndex;
  indexCache.set(dir, index);
  return index;
}

/** Every component name in the registry, in a stable install-friendly order. */
export function listComponents(dir?: string): string[] {
  return Object.keys(readRegistryIndex(dir).components);
}

export function readComponent(name: string, dir?: string): RegistryIndexEntry {
  const entry = readRegistryIndex(dir).components[name];
  if (entry === undefined) {
    throw new Error(
      `Unknown registry component "${name}". Add it to registry/openui-registry.json.`,
    );
  }
  return entry;
}

/** One installable item, with every file's contents inlined. */
export function readItem(
  component: string,
  framework: Framework,
  dir: string = REGISTRY_DIR,
): RegistryItem {
  const entry = readComponent(component, dir);
  const ref = entry.frameworks[framework];
  if (ref === undefined) {
    throw new Error(`Component "${component}" has no ${framework} item.`);
  }
  return JSON.parse(readFileSync(join(dir, ref.item), "utf8")) as RegistryItem;
}

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  ".tsx": "tsx",
  ".jsx": "jsx",
  ".ts": "ts",
  ".js": "js",
  ".svelte": "svelte",
  ".astro": "astro",
  ".vue": "vue",
};

function extension(file: string): string {
  const index = file.lastIndexOf(".");
  return index === -1 ? "" : file.slice(index);
}

export function languageFor(file: string): string {
  return LANGUAGE_BY_EXTENSION[extension(file)] ?? "text";
}

export interface SourceFile {
  /** Destination path template, e.g. `{ui}/button.tsx`. */
  target: string;
  /** Canonical monorepo path, e.g. `packages/react/src/button.tsx`. */
  path: string;
  language: string;
  content: string;
  type: string;
}

/**
 * Canonical source files for a component in one framework. Prefer the
 * TypeScript-authoring variant (`languageVariants` adds `.js`/`.jsx` siblings
 * derived from these), matching what a TypeScript project installs.
 */
export function readSources(
  component: string,
  framework: Framework,
  dir: string = REGISTRY_DIR,
): SourceFile[] {
  const item = readItem(component, framework, dir);
  const preferred = item.files.filter((file) => /\.(tsx|ts|svelte|astro|vue)$/.test(file.path));
  const files = preferred.length > 0 ? preferred : item.files;
  return files.map((file) => ({
    target: file.target,
    path: file.path,
    language: languageFor(file.path),
    content: file.content.trimEnd(),
    type: file.type,
  }));
}

/** The single entry file (component, not helper lib), for a one-file snippet. */
export function readMainSource(
  component: string,
  framework: Framework,
  dir: string = REGISTRY_DIR,
): SourceFile {
  const sources = readSources(component, framework, dir);
  const componentFile = sources.find((file) => file.type === "component");
  const file = componentFile ?? sources[0];
  if (file === undefined) {
    throw new Error(`No sources for "${component}" (${framework}).`);
  }
  return file;
}

/**
 * Every component the docs must cover, read from the committed registry.
 *
 * Used by tests so a component added to the manifest without a docs page fails
 * loudly instead of silently missing from the site.
 */
export function committedRegistryDir(repoRoot: string): string {
  return resolve(repoRoot, "registry");
}
