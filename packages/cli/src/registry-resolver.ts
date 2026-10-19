import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";
import {
  validateRegistryIndex,
  validateRegistryItem,
  type RegistryIndex,
  type RegistryItem,
} from "@openui/core";

/**
 * Registry resolution.
 *
 * A registry is addressed by `registry.url` from `openui.json`:
 * - `http(s)://…` — remote registry: `index.json` and `r/*.json` are fetched.
 * - anything else — local registry directory (absolute, or relative to the
 *   project root). Used for vendored registries, air-gapped setups, and the
 *   OpenUI monorepo itself during development.
 */

export type RegistrySource = { kind: "http"; base: string } | { kind: "fs"; root: string };

export function resolveRegistrySource(url: string, projectRoot: string): RegistrySource {
  if (/^https?:\/\//.test(url)) {
    return { kind: "http", base: url.replace(/\/$/, "") };
  }
  const dir = isAbsolute(url) ? url : resolve(projectRoot, url);
  return { kind: "fs", root: dir };
}

export class RegistryError extends Error {}

async function readRemote(path: string, source: { kind: "http"; base: string }): Promise<unknown> {
  const url = `${source.base}/${path}`;
  let response: Response;
  try {
    response = await fetch(url);
  } catch (error) {
    throw new RegistryError(`Failed to reach registry at ${url}: ${(error as Error).message}`);
  }
  if (!response.ok) {
    throw new RegistryError(`Registry request failed (${response.status}) for ${url}`);
  }
  return response.json();
}

function readLocal(path: string, source: { kind: "fs"; root: string }): unknown {
  const file = join(source.root, path);
  if (!existsSync(file)) {
    throw new RegistryError(`Registry file not found: ${file}`);
  }
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new RegistryError(
      `Registry file is not valid JSON: ${file} (${(error as Error).message})`,
    );
  }
}

/** Fetch and validate the registry index. */
export async function fetchIndex(source: RegistrySource): Promise<RegistryIndex> {
  const raw =
    source.kind === "http"
      ? await readRemote("index.json", source)
      : readLocal("index.json", source);
  const result = validateRegistryIndex(raw);
  if (!result.ok) {
    throw new RegistryError(`Invalid registry index:\n  ${result.errors.join("\n  ")}`);
  }
  return raw as RegistryIndex;
}

/** Fetch and validate a single registry item (path relative to the registry root). */
export async function fetchItem(source: RegistrySource, itemPath: string): Promise<RegistryItem> {
  const raw =
    source.kind === "http" ? await readRemote(itemPath, source) : readLocal(itemPath, source);
  const result = validateRegistryItem(raw);
  if (!result.ok) {
    throw new RegistryError(`Invalid registry item ${itemPath}:\n  ${result.errors.join("\n  ")}`);
  }
  return raw as RegistryItem;
}
