import { FRAMEWORK_NAMES, TARGET_TOKENS } from "../config/types.ts";
import type { RegistryIndex, RegistryItem } from "./types.ts";

/**
 * Zero-dependency validators for the registry index and install items.
 * Both `openui build` (producer) and `openui validate` (consumer-facing CI)
 * use these, so a broken registry can never ship.
 */

export type RegistryValidation = { ok: true; warnings: string[] } | { ok: false; errors: string[]; warnings: string[] };

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const ITEM_PATH_PATTERN = /^r\/[a-z0-9-]+\.json$/;

/** Validate a parsed `index.json`. */
export function validateRegistryIndex(value: unknown): RegistryValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isPlainObject(value)) {
    return { ok: false, errors: ["index.json must contain a JSON object."], warnings };
  }

  if (typeof value.name !== "string" || value.name.trim() === "") {
    errors.push('index.json: "name" must be a non-empty string.');
  }
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+/.test(value.version)) {
    errors.push('index.json: "version" must be a semver string, e.g. "1.0.0".');
  }
  if (value.homepage !== undefined && typeof value.homepage !== "string") {
    errors.push('index.json: "homepage" must be a string when present.');
  }

  if (!isPlainObject(value.components) || Object.keys(value.components).length === 0) {
    errors.push('index.json: "components" must be a non-empty object keyed by component name.');
  } else {
    for (const [name, entry] of Object.entries(value.components)) {
      const at = `index.json components["${name}"]`;
      if (!/^[a-z0-9-]+$/.test(name)) {
        errors.push(`${at}: component names must be lowercase kebab-case.`);
      }
      if (!isPlainObject(entry)) {
        errors.push(`${at}: must be an object.`);
        continue;
      }
      if (typeof entry.title !== "string" || entry.title.trim() === "") {
        errors.push(`${at}: "title" is required.`);
      }
      if (typeof entry.description !== "string" || entry.description.trim() === "") {
        errors.push(`${at}: "description" is required (used by the CLI and LLM docs).`);
      }
      if (!isPlainObject(entry.frameworks) || Object.keys(entry.frameworks).length === 0) {
        errors.push(`${at}: "frameworks" must list at least one framework.`);
        continue;
      }
      for (const [fw, ref] of Object.entries(entry.frameworks)) {
        if (!FRAMEWORK_NAMES.includes(fw as never)) {
          errors.push(`${at}.frameworks: unknown framework "${fw}".`);
          continue;
        }
        if (!isPlainObject(ref) || typeof ref.item !== "string") {
          errors.push(`${at}.frameworks["${fw}"]: must be { "item": "<path>" }.`);
          continue;
        }
        if (!ITEM_PATH_PATTERN.test(ref.item)) {
          errors.push(
            `${at}.frameworks["${fw}"].item: must look like "r/<name>.json" (got "${ref.item}").`,
          );
        }
      }
      if (entry.meta !== undefined && !isPlainObject(entry.meta)) {
        errors.push(`${at}: "meta" must be an object when present.`);
      }
    }
  }

  return errors.length > 0 ? { ok: false, errors, warnings } : { ok: true, warnings };
}

/** Validate a parsed registry item (`r/*.json`). */
export function validateRegistryItem(value: unknown): RegistryValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isPlainObject(value)) {
    return { ok: false, errors: ["Registry item must contain a JSON object."], warnings };
  }

  const at = `item${typeof value.name === "string" ? `[${value.name}]` : ""}`;

  if (typeof value.name !== "string" || !/^[a-z0-9-]+$/.test(value.name)) {
    errors.push(`${at}: "name" must be lowercase kebab-case.`);
  }
  if (typeof value.framework !== "string" || !FRAMEWORK_NAMES.includes(value.framework as never)) {
    errors.push(`${at}: "framework" must be one of ${FRAMEWORK_NAMES.join(", ")}.`);
  }
  if (typeof value.version !== "string" || !/^\d+\.\d+\.\d+/.test(value.version)) {
    errors.push(`${at}: "version" must be a semver string.`);
  }
  if (typeof value.description !== "string" || value.description.trim() === "") {
    errors.push(`${at}: "description" is required.`);
  }

  if (!Array.isArray(value.files) || value.files.length === 0) {
    errors.push(`${at}: "files" must be a non-empty array.`);
  } else {
    for (const [i, file] of value.files.entries()) {
      const fat = `${at}.files[${i}]`;
      if (!isPlainObject(file)) {
        errors.push(`${fat}: must be an object.`);
        continue;
      }
      if (typeof file.path !== "string" || file.path.trim() === "") {
        errors.push(`${fat}: "path" (canonical source path) is required.`);
      }
      if (typeof file.content !== "string" || file.content.trim() === "") {
        errors.push(`${fat}: "content" must be a non-empty string (items must be self-contained).`);
      }
      if (typeof file.target !== "string" || file.target.trim() === "") {
        errors.push(`${fat}: "target" is required, e.g. "{ui}/button.tsx".`);
      } else {
        const tokens = file.target.match(/\{[a-z]+\}/g) ?? [];
        for (const token of tokens) {
          if (!TARGET_TOKENS.includes(token as never)) {
            errors.push(
              `${fat}: unknown target token "${token}" in "${file.target}" (allowed: ${TARGET_TOKENS.join(" ")}).`,
            );
          }
        }
      }
      if (!["component", "lib", "css"].includes(file.type as string)) {
        errors.push(`${fat}: "type" must be one of "component", "lib", "css".`);
      }
    }
  }

  const deps = value.dependencies;
  if (deps !== undefined && !Array.isArray(deps)) {
    errors.push(`${at}: "dependencies" must be an array of strings.`);
  }
  for (const dep of Array.isArray(deps) ? deps : []) {
    if (typeof dep !== "string") {
      errors.push(`${at}: "dependencies" entries must be strings.`);
    } else if (dep.startsWith("@openui/")) {
      errors.push(
        `${at}: dependency "${dep}" is an OpenUI package — installed components must not depend on OpenUI runtime packages.`,
      );
    }
  }
  const regDeps = value.registryDependencies;
  if (regDeps !== undefined && !Array.isArray(regDeps)) {
    errors.push(`${at}: "registryDependencies" must be an array of strings.`);
  }
  for (const dep of Array.isArray(regDeps) ? regDeps : []) {
    if (typeof dep !== "string") {
      errors.push(`${at}: "registryDependencies" entries must be strings.`);
    }
  }

  return errors.length > 0 ? { ok: false, errors, warnings } : { ok: true, warnings };
}
