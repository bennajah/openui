import { DEFAULT_CONFIG, FRAMEWORK_NAMES, type OpenUIConfig } from "./types.ts";

/**
 * Zero-dependency validator for `openui.json`.
 *
 * Design goals:
 * - Actionable messages: every error names the offending JSON path, the
 *   expected shape, and — for unknown keys — a "did you mean" suggestion.
 * - Lenient about the future: unknown fields are reported as warnings and
 *   preserved, never rejected, because tools may extend the config.
 */

export type ValidationResult =
  | { ok: true; config: OpenUIConfig; warnings: string[] }
  | { ok: false; errors: string[]; warnings: string[] };

interface Issue {
  path: string;
  message: string;
}

/** Damerau-free Levenshtein distance, enough for typo suggestions. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const rows = a.length + 1;
  const cols = b.length + 1;
  let prev = Array.from({ length: cols }, (_, i) => i);
  for (let i = 1; i < rows; i += 1) {
    const curr = [i];
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost);
    }
    prev = curr;
  }
  return prev[cols - 1]!;
}

function suggest(key: string, known: readonly string[]): string | undefined {
  let best: string | undefined;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const candidate of known) {
    const score = levenshtein(key.toLowerCase(), candidate.toLowerCase());
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  // Only suggest close matches (typo-sized distance).
  return best !== undefined && bestScore <= Math.max(2, Math.floor(key.length / 3))
    ? best
    : undefined;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const KNOWN_TOP_LEVEL = ["$schema", "framework", "typescript", "tailwind", "aliases", "registry"];
const KNOWN_TAILWIND = ["css", "prefix"];
const KNOWN_ALIASES = ["components", "ui"];
const KNOWN_REGISTRY = ["url"];

/**
 * Validate a parsed `openui.json` value.
 *
 * On success the returned config has all defaults applied, so callers can use
 * it directly without a separate normalization step.
 */
export function validateConfig(value: unknown): ValidationResult {
  const errors: Issue[] = [];
  const warnings: string[] = [];

  if (!isPlainObject(value)) {
    return {
      ok: false,
      errors: [
        `openui.json must contain a JSON object, got ${value === null ? "null" : Array.isArray(value) ? "array" : typeof value}.`,
      ],
      warnings,
    };
  }

  // Unknown fields: warn and preserve (do not fail).
  for (const key of Object.keys(value)) {
    if (!KNOWN_TOP_LEVEL.includes(key)) {
      const hint = suggest(key, KNOWN_TOP_LEVEL);
      warnings.push(
        `Unknown field "${key}" at root.${hint ? ` Did you mean "${hint}"?` : ""} It is preserved but ignored by OpenUI.`,
      );
    }
  }

  // $schema
  if (value.$schema !== undefined && typeof value.$schema !== "string") {
    errors.push({ path: "$schema", message: `must be a string, got ${typeof value.$schema}.` });
  }

  // framework
  let framework = DEFAULT_CONFIG.framework;
  if (value.framework !== undefined) {
    const valid =
      typeof value.framework === "string" &&
      (FRAMEWORK_NAMES.includes(value.framework as never) || value.framework === "auto");
    if (!valid) {
      errors.push({
        path: "framework",
        message: `must be one of ${[...FRAMEWORK_NAMES, "auto"].map((f) => `"${f}"`).join(", ")}, got ${JSON.stringify(value.framework)}.`,
      });
    } else {
      framework = value.framework as OpenUIConfig["framework"];
    }
  }

  // typescript
  let typescript = DEFAULT_CONFIG.typescript;
  if (value.typescript !== undefined) {
    if (typeof value.typescript !== "boolean") {
      errors.push({
        path: "typescript",
        message: `must be a boolean, got ${JSON.stringify(value.typescript)}.`,
      });
    } else {
      typescript = value.typescript;
    }
  }

  // tailwind
  const tailwind = { ...DEFAULT_CONFIG.tailwind };
  if (value.tailwind !== undefined) {
    if (!isPlainObject(value.tailwind)) {
      errors.push({
        path: "tailwind",
        message: `must be an object, got ${JSON.stringify(value.tailwind)}.`,
      });
    } else {
      for (const key of Object.keys(value.tailwind)) {
        if (!KNOWN_TAILWIND.includes(key)) {
          const hint = suggest(key, KNOWN_TAILWIND);
          warnings.push(
            `Unknown field "tailwind.${key}".${hint ? ` Did you mean "tailwind.${hint}"?` : ""} Preserved but ignored.`,
          );
        }
      }
      if (value.tailwind.css !== undefined) {
        if (typeof value.tailwind.css !== "string" || value.tailwind.css.trim() === "") {
          errors.push({
            path: "tailwind.css",
            message: 'must be a non-empty string path, e.g. "src/styles/global.css".',
          });
        } else {
          tailwind.css = value.tailwind.css;
        }
      }
      if (value.tailwind.prefix !== undefined) {
        if (typeof value.tailwind.prefix !== "string") {
          errors.push({
            path: "tailwind.prefix",
            message: 'must be a string, e.g. "" (no prefix) or "tw-".',
          });
        } else if (
          !/^[a-zA-Z][a-zA-Z0-9-]*$/.test(value.tailwind.prefix) &&
          value.tailwind.prefix !== ""
        ) {
          errors.push({
            path: "tailwind.prefix",
            message: `must be a valid Tailwind prefix (letters, digits, dashes), got ${JSON.stringify(value.tailwind.prefix)}.`,
          });
        } else {
          tailwind.prefix = value.tailwind.prefix;
        }
      }
    }
  }

  // aliases
  const aliases = { ...DEFAULT_CONFIG.aliases };
  if (value.aliases !== undefined) {
    if (!isPlainObject(value.aliases)) {
      errors.push({
        path: "aliases",
        message: `must be an object, got ${JSON.stringify(value.aliases)}.`,
      });
    } else {
      for (const key of Object.keys(value.aliases)) {
        if (!KNOWN_ALIASES.includes(key)) {
          const hint = suggest(key, KNOWN_ALIASES);
          warnings.push(
            `Unknown field "aliases.${key}".${hint ? ` Did you mean "aliases.${hint}"?` : ""} Preserved but ignored.`,
          );
        }
      }
      for (const key of KNOWN_ALIASES) {
        const raw = value.aliases[key];
        if (raw === undefined) continue;
        if (typeof raw !== "string" || raw.trim() === "") {
          errors.push({
            path: `aliases.${key}`,
            message: `must be a non-empty import alias string, e.g. "@/components${key === "ui" ? "/ui" : ""}".`,
          });
        } else if (
          !raw.startsWith("@/") &&
          !raw.startsWith("~/") &&
          !raw.startsWith("/") &&
          !raw.startsWith("./")
        ) {
          errors.push({
            path: `aliases.${key}`,
            message: `must be an absolute-style alias starting with "@/", "~/", "/" or "./", got ${JSON.stringify(raw)}.`,
          });
        } else {
          aliases[key as "components" | "ui"] = raw;
        }
      }
    }
  }

  // registry
  const registry = { ...DEFAULT_CONFIG.registry };
  if (value.registry !== undefined) {
    if (!isPlainObject(value.registry)) {
      errors.push({
        path: "registry",
        message: `must be an object, got ${JSON.stringify(value.registry)}.`,
      });
    } else {
      for (const key of Object.keys(value.registry)) {
        if (!KNOWN_REGISTRY.includes(key)) {
          const hint = suggest(key, KNOWN_REGISTRY);
          warnings.push(
            `Unknown field "registry.${key}".${hint ? ` Did you mean "registry.${hint}"?` : ""} Preserved but ignored.`,
          );
        }
      }
      const url = value.registry.url;
      if (url !== undefined) {
        if (typeof url !== "string" || url.trim() === "") {
          errors.push({
            path: "registry.url",
            message:
              'must be a non-empty string, e.g. "https://openui.dev/registry" or "./registry".',
          });
        } else if (
          !/^https?:\/\//.test(url) &&
          !url.startsWith("/") &&
          !url.startsWith("./") &&
          !url.startsWith("../") &&
          !/^[a-z0-9_@]/i.test(url)
        ) {
          errors.push({
            path: "registry.url",
            message: `must be an http(s) URL or a filesystem path, got ${JSON.stringify(url)}.`,
          });
        } else {
          registry.url = url;
        }
      }
    }
  }

  if (errors.length > 0) {
    return {
      ok: false,
      errors: errors.map((e) => `${e.path}: ${e.message}`),
      warnings,
    };
  }

  return {
    ok: true,
    config: {
      ...(typeof value.$schema === "string" ? { $schema: value.$schema } : {}),
      framework,
      typescript,
      tailwind,
      aliases,
      registry,
    },
    warnings,
  };
}

/**
 * Merge a patch into an existing raw config object while preserving unknown
 * fields. Used when a tool safely updates configuration without rewriting it
 * from scratch.
 */
export function mergeConfig(
  existing: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...existing };
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const current = out[key];
    if (isPlainObject(current) && isPlainObject(value)) {
      out[key] = { ...current, ...value };
    } else {
      out[key] = value;
    }
  }
  return out;
}
