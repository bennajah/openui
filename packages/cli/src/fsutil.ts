import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/**
 * Safe file operations for the CLI.
 *
 * Every write goes through a plan → (optional dry run) → apply flow, so the
 * CLI can show exactly what it would do and never clobbers user files without
 * explicit consent (`--overwrite` or interactive confirmation).
 */

export interface WriteCandidate {
  /** Project-root-relative destination path. */
  target: string;
  content: string;
}

export interface WritePlan extends WriteCandidate {
  action: "create" | "overwrite" | "skip";
  /** Absolute path on disk. */
  absolute: string;
}

export interface PlanOptions {
  /** Project root; targets resolve against it. */
  root: string;
  /** Replace existing files. Default false: existing files are skipped and reported. */
  overwrite?: boolean;
}

/** Compute what would happen for each candidate without touching disk. */
export function planWrites(candidates: WriteCandidate[], options: PlanOptions): WritePlan[] {
  return candidates.map((candidate) => {
    const absolute = resolve(options.root, candidate.target);
    const exists = existsSync(absolute);
    const action: WritePlan["action"] = exists
      ? options.overwrite
        ? "overwrite"
        : "skip"
      : "create";
    return { ...candidate, absolute, action };
  });
}

export interface ApplyResult {
  written: WritePlan[];
  skipped: WritePlan[];
}

/** Execute a plan. With `dryRun`, nothing is written. */
export function applyWrites(plans: WritePlan[], options: { dryRun?: boolean } = {}): ApplyResult {
  const written: WritePlan[] = [];
  const skipped: WritePlan[] = [];
  for (const plan of plans) {
    if (plan.action === "skip") {
      skipped.push(plan);
      continue;
    }
    if (!options.dryRun) {
      mkdirSync(dirname(plan.absolute), { recursive: true });
      writeFileSync(plan.absolute, plan.content);
    }
    written.push(plan);
  }
  return { written, skipped };
}

/** Read a JSON file, returning undefined when it does not exist. */
export function readJsonFile<T>(absolute: string): T | undefined {
  if (!existsSync(absolute)) return undefined;
  try {
    return JSON.parse(readFileSync(absolute, "utf8")) as T;
  } catch {
    return undefined;
  }
}

/** Serialize JSON deterministically (stable ordering, trailing newline). */
export function stableJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Join + normalize a root-relative path for display. */
export function displayPath(root: string, absolute: string): string {
  return absolute.startsWith(root) ? absolute.slice(root.length + 1) : absolute;
}

export function joinRoot(root: string, ...parts: string[]): string {
  return join(root, ...parts);
}
