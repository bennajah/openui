/**
 * Minimal, dependency-free argv parser for the OpenUI CLI.
 *
 * Supported forms:
 *   --flag                → true
 *   --no-flag             → false
 *   --key value           → "value"
 *   --key=value           → "value"
 *   positional arguments  → positionals[]
 *
 * The first non-flag token is treated as the command; the rest as
 * positionals passed to the command.
 */
export interface ParsedArgs {
  command: string | undefined;
  positionals: string[];
  flags: Record<string, string | boolean>;
}

const VALUE_FLAGS = new Set([
  "cwd",
  "config",
  "framework",
  "registry",
  "css",
  "components-alias",
  "ui-alias",
]);

export function parseArgs(argv: string[]): ParsedArgs {
  const flags: Record<string, string | boolean> = {};
  const positionals: string[] = [];
  let command: string | undefined;

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i]!;

    if (token.startsWith("--")) {
      const body = token.slice(2);
      const eq = body.indexOf("=");
      if (eq !== -1) {
        flags[body.slice(0, eq)] = body.slice(eq + 1);
        continue;
      }
      if (body.startsWith("no-")) {
        flags[body.slice(3)] = false;
        continue;
      }
      const next = argv[i + 1];
      if (VALUE_FLAGS.has(body) && next !== undefined && !next.startsWith("--")) {
        flags[body] = next;
        i += 1;
        continue;
      }
      flags[body] = true;
      continue;
    }

    if (command === undefined) {
      command = token;
    } else {
      positionals.push(token);
    }
  }

  return { command, positionals, flags };
}

export function flagString(flags: ParsedArgs["flags"], name: string): string | undefined {
  const value = flags[name];
  return typeof value === "string" ? value : undefined;
}

export function flagBool(flags: ParsedArgs["flags"], name: string): boolean | undefined {
  const value = flags[name];
  if (typeof value === "boolean") return value;
  return undefined;
}
