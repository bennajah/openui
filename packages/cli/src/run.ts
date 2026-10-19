import { readFileSync } from "node:fs";
import { join } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { flagBool, flagString, parseArgs, type ParsedArgs } from "./args.ts";
import { addCommand } from "./commands/add.ts";
import { buildCommand } from "./commands/build.ts";
import { diffCommand } from "./commands/diff.ts";
import { initCommand } from "./commands/init.ts";
import { listCommand } from "./commands/list.ts";
import { validateCommand } from "./commands/validate.ts";
import { ui } from "./ui.ts";

/**
 * OpenUI CLI entrypoint.
 *
 * Commands stay thin: each one parses its own flags and delegates to a pure
 * `run*` function in `commands/`. This module owns argument dispatch, help
 * text, version reporting, and top-level error handling.
 */

const PACKAGE_ROOT = fileURLToPath(new URL("..", import.meta.url));

/** Read the CLI version from its own package.json (no build step required). */
export function cliVersion(): string {
  try {
    const raw = readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8");
    return (JSON.parse(raw) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const GLOBAL_HELP = `
${ui.bold("openui")} — framework-native UI components, installed as source.

${ui.bold("Usage")}
  openui <command> [options]

${ui.bold("Commands")}
  init                     Create openui.json (framework detection included)
  add <component…>         Install components from the registry
  list                     List components in the configured registry
  diff <component>         Compare installed files with the registry
  build                    Build the registry (maintainers)
  validate                 Validate openui.json and the configured registry

${ui.bold("Global options")}
  --cwd <dir>              Run as if started in <dir>
  --help                   Show help (also per command)
  --version                Print the CLI version

${ui.bold("Examples")}
  openui init --framework react
  openui add button
  openui add button --dry-run --cwd ./apps/web
  openui validate

Docs: https://openui.dev/llms.txt
`;

const COMMAND_HELP: Record<string, string> = {
  init: `
${ui.bold("openui init")} — write openui.json.

${ui.bold("Options")}
  --framework <react|svelte|astro|vue|auto>  Override auto-detection
  --typescript / --no-typescript              Choose the target language
  --registry <url-or-path>                    Registry location
  --css <path>                                Tailwind CSS entry file
  --components-alias <path>                   Alias for shared components
  --ui-alias <path>                           Alias for installed UI components
  --force                                     Overwrite an existing openui.json
  --yes                                       Accept prompts non-interactively

Unknown fields in an existing config are lost when overwriting.
`,
  add: `
${ui.bold("openui add <component…>")} — install components as source files.

${ui.bold("Options")}
  --dry-run          Show what would be written, change nothing
  --overwrite        Replace existing files
  --yes              Accept prompts non-interactively
  --framework <name> Override the configured framework
  --typescript / --no-typescript  Override the configured language
  --registry <url-or-path>        Override the configured registry
  --config <path>    Use a specific openui.json
  --verbose          Print extra detail

Existing files are skipped unless --overwrite is given.
`,
  list: `
${ui.bold("openui list")} — list registry components.

${ui.bold("Options")}
  --json             Print the raw registry index
  --registry <url-or-path>  Override the configured registry
  --config <path>    Use a specific openui.json
`,
  diff: `
${ui.bold("openui diff <component>")} — compare installed files with the registry.

${ui.bold("Options")}
  --registry <url-or-path>  Override the configured registry
  --config <path>    Use a specific openui.json
`,
  build: `
${ui.bold("openui build")} — build registry/index.json and registry/r/*.json.

Maintainer command: requires registry/openui-registry.json at the repository
root. Sources under packages/<framework>/src stay canonical.
`,
  validate: `
${ui.bold("openui validate")} — validate openui.json and the configured registry.

${ui.bold("Options")}
  --registry <url-or-path>  Override the configured registry
  --config <path>    Use a specific openui.json
`,
};

const ALLOWED_FLAGS: Record<string, ReadonlySet<string>> = {
  init: new Set([
    "components-alias",
    "css",
    "force",
    "framework",
    "help",
    "registry",
    "typescript",
    "ui-alias",
    "yes",
  ]),
  add: new Set([
    "config",
    "dry-run",
    "framework",
    "help",
    "overwrite",
    "registry",
    "typescript",
    "verbose",
    "yes",
  ]),
  list: new Set(["config", "help", "json", "registry"]),
  diff: new Set(["config", "help", "registry"]),
  build: new Set(["help"]),
  validate: new Set(["config", "help", "registry"]),
};

export type CommandName = keyof typeof ALLOWED_FLAGS;

const COMMANDS = new Set<string>(Object.keys(ALLOWED_FLAGS));

function unknownFlags(args: ParsedArgs, allowed: ReadonlySet<string>): string[] {
  return Object.keys(args.flags).filter(
    (name) => name !== "cwd" && name !== "help" && name !== "version" && !allowed.has(name),
  );
}

function printHelp(command?: string): void {
  console.log(
    command !== undefined && COMMAND_HELP[command] !== undefined
      ? COMMAND_HELP[command]
      : GLOBAL_HELP,
  );
}

/**
 * Dispatch a single CLI invocation. Returns the process exit code instead of
 * exiting, which keeps the entrypoint testable via child processes and lets
 * tests call it directly.
 */
export async function main(argv: string[]): Promise<number> {
  let args: ParsedArgs;
  try {
    args = parseArgs(argv);
  } catch (error) {
    ui.error((error as Error).message);
    return 1;
  }

  if (flagBool(args.flags, "version") === true) {
    console.log(cliVersion());
    return 0;
  }

  const command = args.command ?? (flagBool(args.flags, "help") === true ? "help" : undefined);

  if (command === undefined || command === "help") {
    const topic = args.positionals[0];
    printHelp(topic);
    return 0;
  }

  if (!COMMANDS.has(command)) {
    ui.error(`Unknown command "${command}".`);
    console.log("");
    printHelp();
    return 1;
  }

  const allowed = ALLOWED_FLAGS[command]!;
  const invalid = unknownFlags(args, allowed);
  if (invalid.length > 0) {
    ui.error(
      `Unknown option${invalid.length > 1 ? "s" : ""}: ${invalid.map((f) => `--${f}`).join(", ")}`,
    );
    printHelp(command);
    return 1;
  }

  if (flagBool(args.flags, "help") === true) {
    printHelp(command);
    return 0;
  }

  switch (command) {
    case "init":
      return initCommand(args);
    case "add":
      return addCommand(args);
    case "list":
      return listCommand(args);
    case "diff":
      return diffCommand(args);
    case "build":
      try {
        return buildCommand(flagString(args.flags, "cwd") ?? process.cwd());
      } catch (error) {
        ui.error((error as Error).message);
        return 1;
      }
    case "validate":
      return validateCommand(args);
    default:
      return 1;
  }
}
