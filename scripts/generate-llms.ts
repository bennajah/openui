/**
 * Generate `apps/docs/public/llms.txt`, `llms-full.txt`, and the per-page `llms/` files
 * from the canonical Markdown in `apps/docs/content/docs`.
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { buildLlms, PUBLIC_DIR } from "./lib/docs.ts";

const root = resolve(import.meta.dir, "..");
const publicRoot = join(root, PUBLIC_DIR);
const outputs = buildLlms(root);

// Rebuild the generated tree so deleted pages cannot leave stale files behind.
rmSync(join(publicRoot, "llms"), { recursive: true, force: true });
for (const output of outputs) {
  const file = join(publicRoot, output.path);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, output.content);
}

console.log(`Generated ${outputs.length} LLM documentation files in ${PUBLIC_DIR}.`);
