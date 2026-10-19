/**
 * Write the canonical `openui.json` JSON Schema to the docs public directory.
 *
 * The schema object in `@openui/core` is the source of truth. This script only
 * serializes it so the published URL can never drift from the implementation.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { configSchema } from "../packages/core/src/index.ts";

const root = resolve(import.meta.dir, "..");
const target = join(root, "apps/docs/public/schema.json");

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(configSchema, null, 2)}\n`);

console.log(`Wrote apps/docs/public/schema.json (${configSchema.title}).`);
