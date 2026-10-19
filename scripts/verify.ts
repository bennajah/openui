/**
 * Root verification workflow for the OpenUI monorepo.
 *
 * Runs every required check in a sensible order and fails fast on the first
 * failure. Invoked via `bun run verify`.
 *
 * Order rationale:
 * 1. Formatting/linting first — cheapest, most mechanical failures.
 * 2. Type checking next — catches cross-package contract drift.
 * 3. Tests — behavior, including CLI integration tests.
 * 4. Registry build + validation — generated artifacts must be current.
 * 5. LLM documentation generation + validation — docs must be in sync.
 * 6. Production docs build — final proof the site deploys.
 */
import { spawn } from "node:child_process";
import process from "node:process";

interface Step {
  label: string;
  command: string[];
}

const steps: Step[] = [
  { label: "Format check (oxfmt)", command: ["oxfmt", "--check"] },
  { label: "Lint (oxlint)", command: ["oxlint", "."] },
  { label: "Type check (tsc)", command: ["bun", "run", "typecheck"] },
  { label: "Tests (bun test)", command: ["bun", "test"] },
  { label: "Registry build", command: ["bun", "run", "registry:build"] },
  { label: "Registry validation", command: ["bun", "run", "registry:validate"] },
  { label: "LLM docs generation", command: ["bun", "run", "llms:generate"] },
  { label: "LLM docs validation", command: ["bun", "run", "llms:validate"] },
  { label: "Schema generation", command: ["bun", "run", "schema:generate"] },
  { label: "Docs production build", command: ["bun", "run", "build:docs"] },
];

function run(step: Step): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(step.command[0]!, step.command.slice(1), {
      stdio: "inherit",
      env: { ...process.env, FORCE_COLOR: "1" },
    });
    child.on("exit", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}

const started = Date.now();
const failures: string[] = [];

for (const [index, step] of steps.entries()) {
  const header = `[${index + 1}/${steps.length}] ${step.label}`;
  console.log(`\n\x1b[1m▶ ${header}\x1b[0m`);
  // Steps must run sequentially: a failed check invalidates later results.
  // oxlint-disable-next-line eslint/no-await-in-loop
  const code = await run(step);
  if (code !== 0) {
    console.error(`\x1b[31m✖ ${step.label} failed (exit ${code})\x1b[0m`);
    failures.push(step.label);
    break; // fail fast: a broken check invalidates downstream results
  }
  console.log(`\x1b[32m✔ ${step.label}\x1b[0m`);
}

const elapsed = ((Date.now() - started) / 1000).toFixed(1);

if (failures.length > 0) {
  console.error(`\n\x1b[31mVerification failed at: ${failures.join(", ")} (${elapsed}s)\x1b[0m`);
  process.exit(1);
}

console.log(`\n\x1b[32mAll checks passed (${elapsed}s).\x1b[0m`);
