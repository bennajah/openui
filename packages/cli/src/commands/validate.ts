import { dirname, join, relative } from "node:path";
import { applyOverrides, expandTarget, loadConfig, resolveAliases } from "@openui/core";
import { flagString, type ParsedArgs } from "../args.ts";
import { selectFilesForLanguage } from "./add.ts";
import { fetchIndex, fetchItem, resolveRegistrySource } from "../registry-resolver.ts";
import { readTsconfigPaths } from "../tsconfig-paths.ts";
import { ui } from "../ui.ts";

/**
 * `openui validate` — validate openui.json and the configured registry.
 *
 * For filesystem registries, every item referenced by the index is fetched and
 * validated, and each target template is expanded to prove it resolves inside
 * the project. Remote registries are validated only through their index (items
 * are validated at install time).
 */

export async function runValidate(options: {
  cwd: string;
  configPath?: string;
  registry?: string;
}): Promise<{ ok: boolean; errors: string[]; warnings: string[]; checked: string[] }> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const checked: string[] = [];

  const loaded = loadConfig({
    cwd: options.cwd,
    ...(options.configPath !== undefined ? { configPath: options.configPath } : {}),
  });
  if (!loaded.ok) return { ok: false, errors: loaded.errors, warnings, checked };
  warnings.push(...loaded.value.warnings);
  checked.push(loaded.value.filePath);

  const config = applyOverrides(
    loaded.value.config,
    options.registry === undefined ? {} : { registry: options.registry },
  );
  const source = resolveRegistrySource(config.registry.url, loaded.value.root);

  if (source.kind === "http") {
    warnings.push(`Remote registry (${source.base}) — only the index is validated locally.`);
  }

  try {
    const index = await fetchIndex(source);
    checked.push(
      source.kind === "http" ? `${source.base}/index.json` : `${source.root}/index.json`,
    );

    if (source.kind === "fs") {
      const pathsMap = readTsconfigPaths(loaded.value.root);
      const aliases = resolveAliases(config.aliases, pathsMap);
      const tokens = {
        ui: aliases.ui.path,
        components: aliases.components.path,
        css: relative(loaded.value.root, dirname(join(loaded.value.root, config.tailwind.css))),
      };
      for (const [name, entry] of Object.entries(index.components)) {
        for (const [framework, ref] of Object.entries(entry.frameworks)) {
          if (!ref) continue;
          try {
            // oxlint-disable-next-line no-await-in-loop -- errors are reported per item.
            const item = await fetchItem(source, ref.item);
            checked.push(`${source.root}/${ref.item}`);
            if (item.name !== name || item.framework !== framework) {
              errors.push(
                `${ref.item}: item name/framework (${item.name}/${item.framework}) does not match the index entry (${name}/${framework}).`,
              );
            }
            for (const file of selectFilesForLanguage(item.files, config.typescript)) {
              const target = expandTarget(file.target, tokens);
              if (target.startsWith("..") || target.startsWith("/")) {
                errors.push(`${ref.item}: target "${file.target}" escapes the project root.`);
              }
            }
          } catch (error) {
            errors.push((error as Error).message);
          }
        }
      }
    }
  } catch (error) {
    errors.push((error as Error).message);
  }

  return { ok: errors.length === 0, errors, warnings, checked };
}

export async function validateCommand(args: ParsedArgs): Promise<number> {
  const outcome = await runValidate({
    cwd: flagString(args.flags, "cwd") ?? process.cwd(),
    ...(flagString(args.flags, "config") !== undefined
      ? { configPath: flagString(args.flags, "config") as string }
      : {}),
    ...(flagString(args.flags, "registry") !== undefined
      ? { registry: flagString(args.flags, "registry") as string }
      : {}),
  });

  for (const warning of outcome.warnings) ui.warn(warning);

  if (!outcome.ok) {
    for (const error of outcome.errors) ui.error(error);
    return 1;
  }

  ui.success(`Validated ${outcome.checked.length} file(s).`);
  return 0;
}
