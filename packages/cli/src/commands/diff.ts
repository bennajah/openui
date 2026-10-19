import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import {
  applyOverrides,
  detectFramework,
  expandTarget,
  loadConfig,
  resolveAliases,
  type FrameworkName,
  type OpenUIConfig,
  type RegistryItem,
} from "@openui/core";
import { flagString, type ParsedArgs } from "../args.ts";
import { selectFilesForLanguage } from "./add.ts";
import { fetchIndex, fetchItem, resolveRegistrySource } from "../registry-resolver.ts";
import { readTsconfigPaths } from "../tsconfig-paths.ts";
import { ui } from "../ui.ts";

/**
 * `openui diff <component>` — compare installed files with the registry.
 *
 * Intended for reviewing local modifications before upgrading a component.
 * Output is a compact per-file report (in sync / modified / missing) with a
 * line-level diff for modified text files.
 */

export type FileDiffStatus = "in-sync" | "modified" | "missing";

export interface DiffEntry {
  target: string;
  status: FileDiffStatus;
  diff?: string;
}

function firstDifference(local: string, remote: string): string {
  const localLines = local.split("\n");
  const remoteLines = remote.split("\n");
  const out: string[] = [];
  const max = Math.max(localLines.length, remoteLines.length);
  for (let i = 0; i < max; i += 1) {
    const a = localLines[i];
    const b = remoteLines[i];
    if (a === b) continue;
    if (a !== undefined) out.push(`- ${a}`);
    if (b !== undefined) out.push(`+ ${b}`);
    if (out.length > 40) {
      out.push("…");
      break;
    }
  }
  return out.join("\n");
}

export function currentFramework(config: OpenUIConfig, cwd: string): FrameworkName | undefined {
  if (config.framework !== "auto") return config.framework;
  const detected = detectFramework(cwd);
  return detected.confidence === "unknown" ? undefined : detected.framework;
}

export async function runDiff(options: {
  component: string;
  cwd: string;
  configPath?: string;
  registry?: string;
}): Promise<{ ok: true; entries: DiffEntry[] } | { ok: false; errors: string[] }> {
  const loaded = loadConfig({
    cwd: options.cwd,
    ...(options.configPath !== undefined ? { configPath: options.configPath } : {}),
  });
  if (!loaded.ok) return { ok: false, errors: loaded.errors };

  const config = applyOverrides(
    loaded.value.config,
    options.registry === undefined ? {} : { registry: options.registry },
  );
  const framework = currentFramework(config, options.cwd);
  if (!framework) {
    return { ok: false, errors: ["Could not detect the framework; set it in openui.json."] };
  }

  const source = resolveRegistrySource(config.registry.url, loaded.value.root);
  try {
    const index = await fetchIndex(source);
    const entry = index.components[options.component];
    if (!entry) {
      return { ok: false, errors: [`Unknown component "${options.component}".`] };
    }
    const ref = entry.frameworks[framework];
    if (!ref) {
      return {
        ok: false,
        errors: [`Component "${options.component}" has no ${framework} implementation.`],
      };
    }
    const item: RegistryItem = await fetchItem(source, ref.item);

    const pathsMap = readTsconfigPaths(loaded.value.root);
    const aliases = resolveAliases(config.aliases, pathsMap);
    const entries: DiffEntry[] = [];
    for (const file of selectFilesForLanguage(item.files, config.typescript)) {
      const target = expandTarget(file.target, {
        ui: aliases.ui.path,
        components: aliases.components.path,
        css: relative(loaded.value.root, dirname(join(loaded.value.root, config.tailwind.css))),
      });
      const absolute = resolve(loaded.value.root, target);
      if (!existsSync(absolute)) {
        entries.push({ target, status: "missing" });
        continue;
      }
      const local = readFileSync(absolute, "utf8");
      if (local === file.content) {
        entries.push({ target, status: "in-sync" });
      } else {
        entries.push({ target, status: "modified", diff: firstDifference(local, file.content) });
      }
    }
    return { ok: true, entries };
  } catch (error) {
    return { ok: false, errors: [(error as Error).message] };
  }
}

export async function diffCommand(args: ParsedArgs): Promise<number> {
  const component = args.positionals[0];
  if (!component) {
    ui.error("Usage: openui diff <component>");
    return 1;
  }

  const outcome = await runDiff({
    component,
    cwd: flagString(args.flags, "cwd") ?? process.cwd(),
    ...(flagString(args.flags, "config") !== undefined
      ? { configPath: flagString(args.flags, "config") as string }
      : {}),
    ...(flagString(args.flags, "registry") !== undefined
      ? { registry: flagString(args.flags, "registry") as string }
      : {}),
  });

  if (!outcome.ok) {
    for (const error of outcome.errors) ui.error(error);
    return 1;
  }

  for (const entry of outcome.entries) {
    if (entry.status === "in-sync") ui.success(`${entry.target} (in sync)`);
    else if (entry.status === "missing") ui.warn(`${entry.target} (missing — run \`openui add\`)`);
    else {
      ui.warn(`${entry.target} (modified locally)`);
      if (entry.diff) console.log(entry.diff);
    }
  }
  return 0;
}
