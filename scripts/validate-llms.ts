/**
 * Fail when generated LLM docs are missing, stale, contain broken local links,
 * or include obvious secrets.
 */
import { resolve } from "node:path";
import { validateLlms } from "./lib/docs.ts";

const root = resolve(import.meta.dir, "..");
const report = validateLlms(root);

for (const warning of report.warnings) {
  console.warn(`warning: ${warning}`);
}

if (!report.ok) {
  for (const error of report.errors) console.error(`error: ${error}`);
  console.error(`\n${report.errors.length} LLM documentation error(s).`);
  process.exit(1);
}

console.log("LLM documentation is complete, current, and link-safe.");
