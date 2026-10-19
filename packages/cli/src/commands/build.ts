import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import ts from "typescript";
import {
  FRAMEWORK_NAMES,
  validateRegistryIndex,
  validateRegistryItem,
  type ComponentMeta,
  type FrameworkName,
  type RegistryFileType,
  type RegistryIndex,
  type RegistryItem,
  type RegistryItemFile,
} from "@openui/core";
import { stableJson } from "../fsutil.ts";
import { ui } from "../ui.ts";

/**
 * `openui build` — generate the static registry from canonical sources.
 *
 * The OpenUI monorepo keeps component sources in `packages/<framework>/src`.
 * The registry manifest (`registry/openui-registry.json`) points at those
 * files; this command inlines them into self-contained install items and an
 * index. Sources stay canonical — the registry is always reproducible output.
 */

export interface ManifestSource {
  /** Source path relative to the repository root. */
  path: string;
  /** Destination template, e.g. `"{ui}/button.tsx"`. */
  target: string;
  type: RegistryFileType;
  /** Generate a `.jsx` sibling for JavaScript projects (React only). */
  languageVariants?: boolean;
}

export interface ManifestComponent {
  name: string;
  title: string;
  description: string;
  meta?: ComponentMeta;
  sources: Partial<Record<FrameworkName, ManifestSource[]>>;
}

export interface RegistryManifest {
  name: string;
  version: string;
  homepage?: string;
  /** Output directory, relative to the repository root. Defaults to `registry`. */
  output?: string;
  components: ManifestComponent[];
}

/** Transpile TSX → JSX using the TypeScript compiler (dev-time only). */
export function toJsx(source: string, fileName: string): string {
  const result = ts.transpileModule(source, {
    fileName,
    compilerOptions: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.Preserve,
      removeComments: false,
    },
    reportDiagnostics: false,
  });
  return result.outputText;
}

function readPackageVersion(root: string, framework: FrameworkName): string {
  const file = join(root, "packages", framework, "package.json");
  if (!existsSync(file)) return "0.0.0";
  return (JSON.parse(readFileSync(file, "utf8")) as { version?: string }).version ?? "0.0.0";
}

function inlineSource(root: string, source: ManifestSource): RegistryItemFile[] {
  const absolute = join(root, source.path);
  if (!existsSync(absolute)) {
    throw new Error(`Registry source not found: ${source.path}`);
  }
  const content = readFileSync(absolute, "utf8");
  if (content.trim() === "") {
    throw new Error(`Registry source is empty: ${source.path}`);
  }
  const files: RegistryItemFile[] = [
    { path: source.path, content, target: source.target, type: source.type },
  ];

  if (source.languageVariants === true && source.target.endsWith(".tsx")) {
    files.push({
      path: source.path.replace(/\.tsx$/, ".jsx"),
      content: toJsx(content, source.path),
      target: source.target.replace(/\.tsx$/, ".jsx"),
      type: source.type,
    });
  }
  return files;
}

export interface BuildResult {
  index: RegistryIndex;
  items: Map<string, RegistryItem>;
}

/** Build the registry in memory (pure — used by tests and the CLI). */
export function buildRegistry(root: string, manifest: RegistryManifest): BuildResult {
  const items = new Map<string, RegistryItem>();
  const index: RegistryIndex = {
    $schema: "https://openui.dev/registry/schema.json",
    name: manifest.name,
    version: manifest.version,
    ...(manifest.homepage !== undefined ? { homepage: manifest.homepage } : {}),
    components: {},
  };

  for (const component of manifest.components) {
    const frameworks: RegistryIndex["components"][string]["frameworks"] = {};

    for (const framework of FRAMEWORK_NAMES) {
      const sources = component.sources[framework];
      if (!sources || sources.length === 0) continue;

      const files = sources.flatMap((source) => inlineSource(root, source));
      const item: RegistryItem = {
        $schema: "https://openui.dev/registry/item-schema.json",
        name: component.name,
        framework,
        version: readPackageVersion(root, framework),
        description: component.description,
        dependencies: [],
        registryDependencies: [],
        files,
      };

      const validation = validateRegistryItem(item);
      if (!validation.ok) {
        throw new Error(
          `Invalid generated item ${component.name}-${framework}:\n  ${validation.errors.join("\n  ")}`,
        );
      }

      const itemPath = `r/${component.name}-${framework}.json`;
      items.set(itemPath, item);
      frameworks[framework] = { item: itemPath };
    }

    if (Object.keys(frameworks).length === 0) {
      throw new Error(`Component "${component.name}" has no framework sources.`);
    }

    index.components[component.name] = {
      title: component.title,
      description: component.description,
      frameworks,
      ...(component.meta !== undefined ? { meta: component.meta } : {}),
    };
  }

  const indexValidation = validateRegistryIndex(index);
  if (!indexValidation.ok) {
    throw new Error(`Invalid generated registry index:\n  ${indexValidation.errors.join("\n  ")}`);
  }

  return { index, items };
}

export function loadManifest(root: string): RegistryManifest {
  const file = join(root, "registry", "openui-registry.json");
  if (!existsSync(file)) {
    throw new Error(
      `Registry manifest not found: ${file}\n` +
        `\`openui build\` is a maintainer command; it requires registry/openui-registry.json in the repository root.`,
    );
  }
  return JSON.parse(readFileSync(file, "utf8")) as RegistryManifest;
}

export function writeRegistry(
  root: string,
  manifest: RegistryManifest,
  result: BuildResult,
): string[] {
  const outDir = join(root, manifest.output ?? "registry");
  const itemsDir = join(outDir, "r");
  mkdirSync(itemsDir, { recursive: true });

  const written: string[] = [];

  // Prune generated items that are no longer referenced by the index, then
  // write every item deterministically (sorted) so diffs stay reviewable.
  const expected = new Set([...result.items.keys()].map((p) => p.replace(/^r\//, "")));
  for (const file of readdirSync(itemsDir)) {
    if (file.endsWith(".json") && !expected.has(file)) {
      rmSync(join(itemsDir, file));
    }
  }

  // oxlint-disable-next-line unicorn/no-array-sort -- freshly built array, safe to sort.
  for (const [itemPath, item] of [...result.items.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const file = join(outDir, itemPath);
    writeFileSync(file, stableJson(item));
    written.push(file);
  }

  const indexPath = join(outDir, "index.json");
  writeFileSync(indexPath, stableJson(result.index));
  written.push(indexPath);
  return written;
}

export function buildCommand(root: string): number {
  const manifest = loadManifest(root);
  const result = buildRegistry(root, manifest);
  const written = writeRegistry(root, manifest, result);
  ui.success(
    `Built registry ${ui.bold(manifest.name)}@${manifest.version}: ` +
      `${Object.keys(result.index.components).length} component(s), ${result.items.size} item(s).`,
  );
  for (const file of written) ui.step(file.replace(`${resolve(root)}/`, ""));
  return 0;
}
