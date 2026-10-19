import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { CONFIG_FILENAME, type OpenUIConfig } from "./types.ts";
import { validateConfig } from "./validate.ts";

/**
 * Config discovery and loading.
 *
 * The CLI discovers `openui.json` from the current working directory and walks
 * up parent directories (like git searches for `.git`), so monorepo packages
 * inherit the repo-level config unless they carry their own.
 */

export interface LoadedConfig {
  /** Validated configuration with defaults applied. */
  config: OpenUIConfig;
  /** Absolute path of the config file that was loaded. */
  filePath: string;
  /** Project root — the directory containing the config file. */
  root: string;
  /** The file's raw parsed object (unknown fields preserved). */
  raw: Record<string, unknown>;
  /** Non-fatal validation warnings (e.g. unknown fields). */
  warnings: string[];
}

export type LoadConfigResult = { ok: true; value: LoadedConfig } | { ok: false; errors: string[] };

/**
 * Walk up from `startDir` looking for `openui.json`. Returns the first match
 * or `undefined` when none exists up to the filesystem root.
 */
export function findConfigPath(startDir: string): string | undefined {
  let dir = resolve(startDir);
  for (;;) {
    const candidate = join(dir, CONFIG_FILENAME);
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

export interface LoadConfigOptions {
  /** Directory to start discovery from (defaults to `process.cwd()`). */
  cwd?: string;
  /** Explicit config path (relative to cwd or absolute). Skips discovery. */
  configPath?: string;
}

/**
 * Load and validate the configuration.
 *
 * With `configPath`, the file must exist (an explicit path is never silently
 * ignored). Without it, discovery walks up from `cwd`.
 */
export function loadConfig(options: LoadConfigOptions = {}): LoadConfigResult {
  const cwd = resolve(options.cwd ?? process.cwd());

  let filePath: string | undefined;
  if (options.configPath) {
    filePath = isAbsolute(options.configPath)
      ? options.configPath
      : resolve(cwd, options.configPath);
    if (!existsSync(filePath)) {
      return { ok: false, errors: [`Config file not found: ${filePath}`] };
    }
  } else {
    filePath = findConfigPath(cwd);
    if (!filePath) {
      return {
        ok: false,
        errors: [
          `No ${CONFIG_FILENAME} found in ${cwd} or any parent directory. Run \`openui init\` to create one.`,
        ],
      };
    }
  }

  let parsed: unknown;
  const source = readFileSync(filePath, "utf8");
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    return { ok: false, errors: [`${filePath} is not valid JSON: ${(error as Error).message}`] };
  }

  const result = validateConfig(parsed);
  if (!result.ok) {
    return {
      ok: false,
      errors: result.errors.map((e) => `${filePath}: ${e}`),
    };
  }

  return {
    ok: true,
    value: {
      config: result.config,
      filePath,
      root: dirname(filePath),
      raw: isPlainRecord(parsed) ? parsed : {},
      warnings: result.warnings,
    },
  };
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Apply CLI flag overrides on top of a loaded config (flags win, config file is not rewritten). */
export function applyOverrides(
  config: OpenUIConfig,
  overrides: {
    framework?: OpenUIConfig["framework"];
    typescript?: boolean;
    registry?: string;
  },
): OpenUIConfig {
  return {
    ...config,
    ...(overrides.framework !== undefined ? { framework: overrides.framework } : {}),
    ...(overrides.typescript !== undefined ? { typescript: overrides.typescript } : {}),
    ...(overrides.registry !== undefined
      ? { registry: { ...config.registry, url: overrides.registry } }
      : {}),
  };
}
