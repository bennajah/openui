import { dirname, isAbsolute, relative, resolve } from "node:path";
import {
  applyOverrides,
  detectFramework,
  expandTarget,
  EXTENSION_BY_LANGUAGE,
  loadConfig,
  resolveAliases,
  type FrameworkChoice,
  type FrameworkName,
  type OpenUIConfig,
  type RegistryItem,
  type RegistryItemFile,
} from "@openui/core";
import { flagBool, flagString, type ParsedArgs } from "../args.ts";
import { applyWrites, displayPath, planWrites, type WriteCandidate } from "../fsutil.ts";
import { fetchIndex, fetchItem, resolveRegistrySource } from "../registry-resolver.ts";
import { readTsconfigPaths } from "../tsconfig-paths.ts";
import { ui } from "../ui.ts";

/**
 * `openui add <component…>` — install components from the registry.
 *
 * Safety model:
 * - Existing files are never overwritten unless `--overwrite` (or an
 *   interactive confirmation) is given; they are reported as skipped.
 * - `--dry-run` prints the full plan and touches nothing.
 * - All paths are validated to stay inside the project root.
 */

export interface AddOptions {
  components: string[];
  cwd: string;
  configPath?: string;
  registry?: string;
  framework?: FrameworkChoice;
  typescript?: boolean;
  dryRun?: boolean;
  overwrite?: boolean;
  yes?: boolean;
  verbose?: boolean;
}

export interface AddSummary {
  installed: string[];
  skipped: string[];
  planned: string[];
  notes: string[];
}

export type AddOutcome = { ok: true; summary: AddSummary } | { ok: false; errors: string[] };

/**
 * Rewrite relative TypeScript specifiers to their JavaScript equivalents when
 * installing into a JavaScript project. Every `.ts`/`.tsx` file in an item has a
 * selected `.js`/`.jsx` sibling, so this keeps sibling imports resolvable — in
 * plain modules and in framework component files (`.svelte`, `.astro`, `.vue`).
 */
export function rewriteImportsToJs(content: string, typescript: boolean): string {
  if (typescript) return content;
  return content
    .replace(/(from\s+["'])(\.[^"']*?)\.tsx(["'])/g, "$1$2.jsx$3")
    .replace(/(from\s+["'])(\.[^"']*?)\.ts(["'])/g, "$1$2.js$3")
    .replace(/(import\s*\(\s*["'])(\.[^"']*?)\.tsx(["']\s*\))/g, "$1$2.jsx$3")
    .replace(/(import\s*\(\s*["'])(\.[^"']*?)\.ts(["']\s*\))/g, "$1$2.js$3");
}

/** Select the language-appropriate variant of each file. */
export function selectFilesForLanguage(
  files: RegistryItemFile[],
  typescript: boolean,
): RegistryItemFile[] {
  const language = typescript ? "ts" : "js";
  const preferred = EXTENSION_BY_LANGUAGE[language];

  // Group by target stem so ts/js variants of the same file collapse to one.
  const groups = new Map<string, RegistryItemFile[]>();
  for (const file of files) {
    const stem = file.target.replace(/\.(tsx|jsx|ts|js)$/, "");
    const list = groups.get(stem) ?? [];
    list.push(file);
    groups.set(stem, list);
  }

  const selected: RegistryItemFile[] = [];
  for (const group of groups.values()) {
    if (group.length === 1) {
      selected.push(group[0]!);
      continue;
    }
    const pick = group.find((f) => preferred.some((ext) => f.target.endsWith(ext))) ?? group[0]!;
    selected.push(pick);
  }
  return selected;
}

function resolveFrameworkChoice(
  config: OpenUIConfig,
  cwd: string,
): FrameworkName | { error: string } {
  if (config.framework !== "auto") return config.framework;
  const detection = detectFramework(cwd);
  if (detection.framework !== undefined && detection.confidence !== "unknown") {
    ui.step(`Detected framework: ${ui.bold(detection.framework)} (${detection.confidence})`);
    return detection.framework;
  }
  return {
    error:
      'Could not detect the framework. Set "framework" in openui.json or pass --framework <react|svelte|astro|vue>.',
  };
}

export async function runAdd(options: AddOptions): Promise<AddOutcome> {
  const cwd = resolve(options.cwd);
  const loaded = loadConfig({
    cwd,
    ...(options.configPath !== undefined ? { configPath: options.configPath } : {}),
  });
  if (!loaded.ok) return { ok: false, errors: loaded.errors };
  for (const warning of loaded.value.warnings) ui.warn(warning);

  const config = applyOverrides(loaded.value.config, {
    ...(options.framework !== undefined ? { framework: options.framework } : {}),
    ...(options.typescript !== undefined ? { typescript: options.typescript } : {}),
    ...(options.registry !== undefined ? { registry: options.registry } : {}),
  });
  const root = loaded.value.root;

  const framework = resolveFrameworkChoice(config, cwd);
  if (typeof framework === "object") return { ok: false, errors: [framework.error] };

  const source = resolveRegistrySource(config.registry.url, root);
  let index;
  try {
    index = await fetchIndex(source);
  } catch (error) {
    return { ok: false, errors: [(error as Error).message] };
  }

  const pathsMap = readTsconfigPaths(root);
  const aliases = resolveAliases(config.aliases, pathsMap);
  const cssDir = dirname(config.tailwind.css);
  const tokenValues = { ui: aliases.ui.path, components: aliases.components.path, css: cssDir };

  const notes: string[] = [];
  const toInstall: { name: string; item: RegistryItem }[] = [];
  const seen = new Set<string>();

  // Resolve components (with registryDependencies) depth-first.
  const queue = [...options.components];
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (seen.has(name)) continue;
    seen.add(name);
    const entry = index.components[name];
    if (!entry) {
      const available = Object.keys(index.components).join(", ");
      return { ok: false, errors: [`Unknown component "${name}". Available: ${available}`] };
    }
    const ref = entry.frameworks[framework];
    if (!ref) {
      const supported = Object.keys(entry.frameworks).join(", ");
      return {
        ok: false,
        errors: [
          `Component "${name}" has no ${framework} implementation (available for: ${supported}).`,
        ],
      };
    }
    // oxlint-disable-next-line no-await-in-loop -- dependencies are discovered incrementally.
    const item = await fetchItem(source, ref.item).catch((error: unknown) => error as Error);
    if (item instanceof Error) {
      return { ok: false, errors: [item.message] };
    }
    toInstall.push({ name, item });
    queue.push(...(item.registryDependencies ?? []));
  }

  const candidates: WriteCandidate[] = [];
  for (const { item } of toInstall) {
    const files = selectFilesForLanguage(item.files, config.typescript);
    for (const file of files) {
      const target = expandTarget(file.target, tokenValues);
      const absolute = resolve(root, target);
      const rel = relative(root, absolute);
      const segments = target.split("/");
      if (segments.includes("..") || rel.startsWith("..") || isAbsolute(rel)) {
        return { ok: false, errors: [`Refusing to write outside the project: ${target}`] };
      }
      candidates.push({
        target,
        content: rewriteImportsToJs(file.content, config.typescript),
      });
    }
    for (const dep of item.dependencies ?? []) {
      notes.push(
        `"${item.name}" requires the npm package "${dep}" — install it with your package manager (e.g. \`bun add ${dep}\`).`,
      );
    }
  }

  const overwrite = options.overwrite === true || options.yes === true;
  const plans = planWrites(candidates, { root, overwrite });
  const result = applyWrites(plans, { dryRun: options.dryRun === true });

  const writtenPaths = result.written.map((p) => displayPath(root, p.absolute));
  const summary: AddSummary = {
    installed: options.dryRun === true ? [] : writtenPaths,
    skipped: result.skipped.map((p) => displayPath(root, p.absolute)),
    planned: options.dryRun === true ? writtenPaths : [],
    notes,
  };
  return { ok: true, summary };
}

export async function addCommand(args: ParsedArgs): Promise<number> {
  const components = args.positionals;
  if (components.length === 0) {
    ui.error("Usage: openui add <component…>  (e.g. `openui add button`)");
    return 1;
  }

  const outcome = await runAdd({
    components,
    cwd: flagString(args.flags, "cwd") ?? process.cwd(),
    ...(flagString(args.flags, "config") !== undefined
      ? { configPath: flagString(args.flags, "config") as string }
      : {}),
    ...(flagString(args.flags, "registry") !== undefined
      ? { registry: flagString(args.flags, "registry") as string }
      : {}),
    ...(flagString(args.flags, "framework") !== undefined
      ? { framework: flagString(args.flags, "framework") as FrameworkChoice }
      : {}),
    ...(flagBool(args.flags, "typescript") !== undefined
      ? { typescript: flagBool(args.flags, "typescript") as boolean }
      : {}),
    ...(flagBool(args.flags, "dry-run") === true ? { dryRun: true } : {}),
    ...(flagBool(args.flags, "overwrite") === true ? { overwrite: true } : {}),
    ...(flagBool(args.flags, "yes") === true ? { yes: true } : {}),
    ...(flagBool(args.flags, "verbose") === true ? { verbose: true } : {}),
  });

  if (!outcome.ok) {
    for (const error of outcome.errors) ui.error(error);
    return 1;
  }

  const { installed, skipped, planned, notes } = outcome.summary;
  const verb = planned.length > 0 ? "Would install" : "Installed";

  if (planned.length > 0) {
    for (const file of planned) ui.step(`${verb} ${ui.bold(file)}`);
    ui.info("Dry run — no files were written.");
  } else {
    for (const file of installed) ui.success(file);
    if (installed.length > 0) {
      ui.step(`${installed.length} file(s) written.`);
    }
  }
  for (const file of skipped) {
    ui.warn(`Skipped existing ${file} (pass --overwrite to replace)`);
  }
  for (const note of notes) ui.info(note);
  return 0;
}

/** Exported for tests: compute the destination of an item file without writing. */
export function targetForFile(
  file: RegistryItemFile,
  root: string,
  config: OpenUIConfig,
  pathsMap?: Record<string, string | string[]>,
): string {
  const aliases = resolveAliases(config.aliases, pathsMap);
  const target = expandTarget(file.target, {
    ui: aliases.ui.path,
    components: aliases.components.path,
    css: dirname(config.tailwind.css),
  });
  return relative(root, resolve(root, target));
}
