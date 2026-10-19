import { flagBool, flagString, type ParsedArgs } from "../args.ts";
import { loadConfig, type RegistryIndex } from "@openui/core";
import { fetchIndex, resolveRegistrySource } from "../registry-resolver.ts";
import { ui } from "../ui.ts";

/** `openui list` — show components available in the configured registry. */

export async function runList(options: {
  cwd: string;
  configPath?: string;
  registry?: string;
}): Promise<{ ok: true; index: RegistryIndex } | { ok: false; errors: string[] }> {
  const loaded = loadConfig({
    cwd: options.cwd,
    ...(options.configPath !== undefined ? { configPath: options.configPath } : {}),
  });
  if (!loaded.ok) return { ok: false, errors: loaded.errors };

  const url = options.registry ?? loaded.value.config.registry.url;
  const source = resolveRegistrySource(url, loaded.value.root);
  try {
    const index = await fetchIndex(source);
    return { ok: true, index };
  } catch (error) {
    return { ok: false, errors: [(error as Error).message] };
  }
}

export async function listCommand(args: ParsedArgs): Promise<number> {
  const outcome = await runList({
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

  if (flagBool(args.flags, "json") === true) {
    console.log(JSON.stringify(outcome.index, null, 2));
    return 0;
  }

  // oxlint-disable-next-line unicorn/no-array-sort -- freshly built array, safe to sort.
  const entries = Object.entries(outcome.index.components).sort(([a], [b]) => a.localeCompare(b));
  console.log(ui.bold(`Registry ${outcome.index.name}@${outcome.index.version}`));
  for (const [name, entry] of entries) {
    const frameworks = Object.keys(entry.frameworks).join(", ");
    console.log(`  ${ui.bold(name)}  ${ui.dim(frameworks)}`);
    console.log(`    ${entry.description}`);
  }
  ui.info(`Install with: ${ui.bold("openui add <component>")}`);
  return 0;
}
