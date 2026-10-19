import { existsSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import {
  CONFIG_FILENAME,
  DEFAULT_CONFIG,
  detectFramework,
  EXAMPLE_CONFIG,
  type FrameworkChoice,
  validateConfig,
} from "@openui/core";
import { flagBool, flagString, type ParsedArgs } from "../args.ts";
import { hasTsconfig } from "../tsconfig-paths.ts";
import { ui } from "../ui.ts";

/**
 * `openui init` — generate `openui.json`.
 *
 * Guarantees:
 * - Never overwrites an existing config without `--force` (or an explicit
 *   interactive confirmation).
 * - Framework detection runs unless `--framework` is passed explicitly.
 * - The generated file validates against the published schema by construction
 *   (it is built from EXAMPLE_CONFIG and re-validated before writing).
 */

export interface InitOptions {
  cwd: string;
  framework?: FrameworkChoice;
  typescript?: boolean;
  registry?: string;
  css?: string;
  componentsAlias?: string;
  uiAlias?: string;
  force?: boolean;
  yes?: boolean;
  /** Injected for tests: returns whether the user confirmed an overwrite. */
  confirmOverwrite?: () => Promise<boolean>;
}

export type InitOutcome =
  | { ok: true; path: string; created: boolean; warnings: string[] }
  | { ok: false; errors: string[] };

export async function runInit(options: InitOptions): Promise<InitOutcome> {
  const cwd = resolve(options.cwd);
  const configPath = join(cwd, CONFIG_FILENAME);
  const warnings: string[] = [];

  if (existsSync(configPath) && !options.force) {
    let confirmed = false;
    if (process.stdin.isTTY && !options.yes && options.confirmOverwrite) {
      confirmed = await options.confirmOverwrite();
    }
    if (!confirmed) {
      return {
        ok: false,
        errors: [
          `${configPath} already exists. Re-run with --force to overwrite it (existing unknown fields will be lost).`,
        ],
      };
    }
  }

  // Framework: explicit flag wins; otherwise detect.
  let framework: FrameworkChoice = options.framework ?? DEFAULT_CONFIG.framework;
  if (options.framework === undefined) {
    const detection = detectFramework(cwd);
    if (detection.framework !== undefined && detection.confidence !== "unknown") {
      framework = detection.framework;
      ui.step(`Detected framework: ${ui.bold(framework)} (${detection.confidence})`);
    } else {
      warnings.push(
        `Could not detect a framework automatically. Written "auto" — pass --framework <react|svelte|astro|vue> or edit ${CONFIG_FILENAME}.`,
      );
    }
  }

  // TypeScript: explicit flag wins; otherwise infer from tsconfig presence.
  const typescript = options.typescript ?? (hasTsconfig(cwd) ? true : DEFAULT_CONFIG.typescript);
  if (options.typescript === undefined && !hasTsconfig(cwd)) {
    warnings.push(
      "No tsconfig.json or jsconfig.json found — defaulting to TypeScript. Re-run with --no-typescript for a JavaScript project.",
    );
  }

  const candidate = {
    ...EXAMPLE_CONFIG,
    framework,
    typescript,
    tailwind: {
      ...DEFAULT_CONFIG.tailwind,
      ...(options.css !== undefined ? { css: options.css } : {}),
    },
    aliases: {
      ...DEFAULT_CONFIG.aliases,
      ...(options.componentsAlias !== undefined ? { components: options.componentsAlias } : {}),
      ...(options.uiAlias !== undefined ? { ui: options.uiAlias } : {}),
    },
    registry: {
      ...DEFAULT_CONFIG.registry,
      ...(options.registry !== undefined ? { url: options.registry } : {}),
    },
  };

  // Defensive: never write a config that would not validate.
  const validation = validateConfig(candidate);
  if (!validation.ok) {
    return { ok: false, errors: validation.errors.map((e) => `generated config invalid — ${e}`) };
  }

  writeFileSync(configPath, `${JSON.stringify(candidate, null, 2)}\n`);
  return { ok: true, path: configPath, created: true, warnings };
}

export async function initCommand(args: ParsedArgs): Promise<number> {
  const cwd = resolve(flagString(args.flags, "cwd") ?? process.cwd());
  const frameworkFlag = flagString(args.flags, "framework");
  if (
    frameworkFlag !== undefined &&
    !["react", "svelte", "astro", "vue", "auto"].includes(frameworkFlag)
  ) {
    ui.error(`--framework must be one of react, svelte, astro, vue, auto (got "${frameworkFlag}")`);
    return 1;
  }

  const result = await runInit({
    cwd,
    ...(frameworkFlag !== undefined ? { framework: frameworkFlag as FrameworkChoice } : {}),
    ...(flagBool(args.flags, "typescript") !== undefined
      ? { typescript: flagBool(args.flags, "typescript") as boolean }
      : {}),
    ...(flagString(args.flags, "registry") !== undefined
      ? { registry: flagString(args.flags, "registry") as string }
      : {}),
    ...(flagString(args.flags, "css") !== undefined
      ? { css: flagString(args.flags, "css") as string }
      : {}),
    ...(flagString(args.flags, "components-alias") !== undefined
      ? { componentsAlias: flagString(args.flags, "components-alias") as string }
      : {}),
    ...(flagString(args.flags, "ui-alias") !== undefined
      ? { uiAlias: flagString(args.flags, "ui-alias") as string }
      : {}),
    ...(flagBool(args.flags, "force") === true ? { force: true } : {}),
    ...(flagBool(args.flags, "yes") === true ? { yes: true } : {}),
  });

  if (!result.ok) {
    for (const error of result.errors) ui.error(error);
    return 1;
  }

  for (const warning of result.warnings) ui.warn(warning);
  ui.success(`Wrote ${ui.bold(result.path)}`);
  ui.info(`Next: ${ui.bold("openui add button")} to install your first component.`);
  return 0;
}

/** Exported for tests: where `init` would write, without running it. */
export function initTargetPath(cwd: string, configPath?: string): string {
  return configPath ? resolve(dirname(cwd), configPath) : join(resolve(cwd), CONFIG_FILENAME);
}
