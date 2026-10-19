/**
 * Copy the generated registry into the docs site's public directory so it is
 * served at https://openuii.vercel.app/registry (the CLI's default registry URL).
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const source = join(root, "registry");
const target = join(root, "apps/docs/public/registry");

rmSync(target, { recursive: true, force: true });
mkdirSync(join(target, "r"), { recursive: true });

copyFileSync(join(source, "index.json"), join(target, "index.json"));
for (const file of readdirSync(join(source, "r"))) {
  if (file.endsWith(".json")) copyFileSync(join(source, "r", file), join(target, "r", file));
}

console.log("Copied registry/index.json and registry/r/*.json to apps/docs/public/registry.");
