import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads `compilerOptions.paths` from the project's tsconfig or jsconfig so
 * install destinations can honor real alias mappings instead of guessing.
 */

export type PathsMap = Record<string, string | string[]>;

function readJsonc(file: string): Record<string, unknown> | undefined {
  // tsconfig files are JSONC (comments allowed). Strip comments minimally.
  const text = readFileSync(file, "utf8");
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  try {
    return JSON.parse(stripped) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

/** Load `compilerOptions.paths` from tsconfig.json or jsconfig.json at `root`. */
export function readTsconfigPaths(root: string): PathsMap | undefined {
  for (const name of ["tsconfig.json", "jsconfig.json"]) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    const parsed = readJsonc(file);
    const compilerOptions = parsed?.compilerOptions;
    if (typeof compilerOptions === "object" && compilerOptions !== null) {
      const paths = (compilerOptions as Record<string, unknown>).paths;
      if (typeof paths === "object" && paths !== null && !Array.isArray(paths)) {
        return paths as PathsMap;
      }
    }
    return undefined;
  }
  return undefined;
}

/** True when the project looks like a TypeScript project (tsconfig present). */
export function hasTsconfig(root: string): boolean {
  return existsSync(join(root, "tsconfig.json")) || existsSync(join(root, "jsconfig.json"));
}
