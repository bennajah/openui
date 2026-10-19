/**
 * Write the canonical `openui.json` JSON Schema to the docs public directory.
 *
 * The schema object in `@openui/core` is the source of truth. This script only
 * serializes it so the published URL can never drift from the implementation.
 *
 * The output is piped through `oxfmt` so the committed file matches what
 * `bun run format:check` expects. Generation runs after the format check in
 * `bun run verify`, so the two must agree byte-for-byte.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { configSchema } from "../packages/core/src/index.ts";

const root = resolve(import.meta.dir, "..");
const target = join(root, "apps/docs/public/schema.json");

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(configSchema, null, 2)}\n`);

// `node_modules/.bin` is not on PATH for this script; resolve the workspace binary.
const oxfmt = join(root, "node_modules/.bin/oxfmt");
execFileSync(oxfmt, [target], { stdio: "ignore" });

console.log(`Wrote apps/docs/public/schema.json (${configSchema.title}).`);
