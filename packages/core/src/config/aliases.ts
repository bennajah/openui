import type { AliasesConfig } from "../config/types.ts";

/**
 * Alias → filesystem-path resolution.
 *
 * Import aliases (`@/components/ui`) are also used as install destinations.
 * The real directory is resolved from the project's tsconfig/jsconfig
 * `compilerOptions.paths` when available, falling back to the ubiquitous
 * `@/` → `src/` convention.
 */

export interface AliasResolution {
  /** Project-root-relative directory, e.g. `src/components/ui`. */
  path: string;
  /** How the mapping was determined. */
  via: "tsconfig" | "jsconfig" | "convention";
}

type PathsMap = Record<string, string | string[]>;

function firstPathTarget(targets: string | string[] | undefined): string | undefined {
  if (targets === undefined) return undefined;
  const first = Array.isArray(targets) ? targets[0] : targets;
  if (first === undefined) return undefined;
  return first.replace(/\/\*$/, "").replace(/^\.\//, "");
}

/**
 * Resolve a single alias to a project-root-relative directory.
 *
 * @param alias   e.g. `"@/components/ui"`
 * @param pathsMap  `compilerOptions.paths` from tsconfig/jsconfig, if available
 */
export function resolveAliasToPath(alias: string, pathsMap?: PathsMap): AliasResolution {
  // 1. Exact match (e.g. `"@/components": ["./src/components"]`).
  const direct = firstPathTarget(pathsMap?.[alias]);
  if (direct !== undefined) {
    return { path: direct, via: "tsconfig" };
  }

  // 2. Wildcard match: the longest `"prefix/*"` entry covering the alias.
  //    tsconfig semantics: the `*` in the pattern matches a suffix, which is
  //    substituted into the `*` of the target.
  //    e.g. `"@/components/*": ["./src/components/*"]` covers
  //    `"@/components/ui"` → `"src/components/ui"`.
  let bestKey: string | undefined;
  let bestTarget: string | undefined;
  for (const [key, targets] of Object.entries(pathsMap ?? {})) {
    if (!key.endsWith("/*")) continue;
    const prefix = key.slice(0, -2);
    if (!(alias === prefix || alias.startsWith(`${prefix}/`))) continue;
    const raw = Array.isArray(targets) ? targets[0] : targets;
    if (raw === undefined) continue;
    const suffix = alias.slice(prefix.length); // e.g. "/ui", or "" when alias === prefix
    const target = raw.endsWith("/*")
      ? raw.slice(0, -2) + suffix
      : raw;
    if (bestKey === undefined || key.length > bestKey.length) {
      bestKey = key;
      bestTarget = target.replace(/^\.\//, "").replace(/\/$/, "");
    }
  }
  if (bestTarget !== undefined) {
    return { path: bestTarget, via: "tsconfig" };
  }

  // Convention fallback.
  if (alias.startsWith("@/") || alias.startsWith("~/")) {
    return { path: `src/${alias.slice(2)}`.replace(/\/$/, ""), via: "convention" };
  }
  if (alias.startsWith("./")) {
    return { path: alias.slice(2).replace(/\/$/, ""), via: "convention" };
  }
  if (alias.startsWith("/")) {
    return { path: alias.slice(1).replace(/\/$/, ""), via: "convention" };
  }
  // Bare alias without path info — treat as root-relative directory.
  return { path: alias.replace(/\/$/, ""), via: "convention" };
}

export interface ResolvedAliases {
  components: AliasResolution;
  ui: AliasResolution;
}

/** Resolve both configured aliases at once. */
export function resolveAliases(aliases: AliasesConfig, pathsMap?: PathsMap): ResolvedAliases {
  return {
    components: resolveAliasToPath(aliases.components, pathsMap),
    ui: resolveAliasToPath(aliases.ui, pathsMap),
  };
}

export interface TargetTokenValues {
  ui: string;
  components: string;
  css: string;
}

/**
 * Expand `{ui}`, `{components}` and `{css}` tokens in a registry file target.
 * Unknown tokens are left in place so validation can report them.
 */
export function expandTarget(target: string, values: TargetTokenValues): string {
  return target
    .replaceAll("{ui}", values.ui)
    .replaceAll("{components}", values.components)
    .replaceAll("{css}", values.css);
}
