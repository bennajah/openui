import type { FrameworkName } from "../config/types.ts";

/**
 * Registry data model.
 *
 * A registry is a directory (or URL prefix) containing:
 * - `index.json` — the catalog: every component, its metadata, and where each
 *   framework's installable item lives (relative to the registry root).
 * - `r/<component>-<framework>.json` — self-contained install items with all
 *   file contents inlined, so installing one component is a single fetch.
 *
 * Sources are canonical in `packages/<framework>/src`; `openui build`
 * generates the registry so the two can never drift.
 */

export interface RegistryIndex {
  $schema?: string;
  /** Registry name, e.g. `"openui"`. */
  name: string;
  /** Registry data format version (semver). */
  version: string;
  homepage?: string;
  components: Record<string, RegistryComponentEntry>;
}

export interface RegistryComponentEntry {
  title: string;
  description: string;
  /** Which frameworks have an installable item, and the item path (registry-root relative). */
  frameworks: Partial<Record<FrameworkName, { item: string }>>;
  /** Documentation metadata shared with the docs site and llms generation. */
  meta?: ComponentMeta;
}

export interface ComponentMetaEntry {
  name: string;
  description: string;
}

export interface ComponentMeta {
  variant?: ComponentMetaEntry[];
  size?: ComponentMetaEntry[];
  props?: {
    name: string;
    type: string;
    default: string;
    description: string;
  }[];
}

export type RegistryFileType = "component" | "lib" | "css";

export interface RegistryItemFile {
  /** Canonical source path within the OpenUI monorepo (traceability). */
  path: string;
  /** Full file contents, inlined at registry-build time. */
  content: string;
  /** Destination template, e.g. `"{ui}/button.tsx"`. Tokens: {ui} {components} {css}. */
  target: string;
  type: RegistryFileType;
}

export interface RegistryItem {
  $schema?: string;
  /** Component name, e.g. `"button"`. */
  name: string;
  /** Framework this item installs into. */
  framework: FrameworkName;
  /** Component version (tracks the owning package version). */
  version: string;
  description: string;
  /** npm dependencies the CLI must install (OpenUI components keep this empty). */
  dependencies?: string[];
  /** Other registry items this item depends on (installed together). */
  registryDependencies?: string[];
  files: RegistryItemFile[];
}

/** File extensions the CLI prefers per language mode when both variants exist. */
export const EXTENSION_BY_LANGUAGE: Record<"ts" | "js", readonly string[]> = {
  ts: [".tsx", ".ts", ".vue", ".svelte", ".astro"],
  js: [".jsx", ".js", ".vue", ".svelte", ".astro"],
};
