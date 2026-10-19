import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { FrameworkName } from "../config/types.ts";

/**
 * Automatic framework detection.
 *
 * Signals, strongest first:
 * 1. Framework-specific config files (astro.config.*, svelte.config.*,
 *    nuxt.config.*, next.config.*).
 * 2. Framework dependencies in package.json.
 * 3. Telltale source files (src/App.svelte, src/App.vue, app.vue …).
 *
 * When several frameworks are detected (e.g. an Astro site embedding Svelte),
 * the build-tool config file wins, because it controls compilation.
 */

export type DetectionConfidence = "certain" | "probable" | "unknown";

export interface DetectionResult {
  framework: FrameworkName | undefined;
  confidence: DetectionConfidence;
  /** Human-readable evidence, useful in `--verbose` output and error messages. */
  evidence: string[];
}

interface PackageJsonLike {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

const CONFIG_FILES: Record<FrameworkName, readonly string[]> = {
  astro: ["astro.config.mjs", "astro.config.ts", "astro.config.js", "astro.config.mts", "astro.config.cts"],
  svelte: ["svelte.config.js", "svelte.config.ts", "svelte.config.mjs"],
  vue: ["nuxt.config.ts", "nuxt.config.js", "nuxt.config.mjs"],
  react: ["next.config.js", "next.config.mjs", "next.config.ts", "next.config.cts"],
};

const DEP_FRAMEWORKS: Record<string, FrameworkName> = {
  astro: "astro",
  svelte: "svelte",
  vue: "vue",
  nuxt: "vue",
  react: "react",
  "react-dom": "react",
  next: "react",
  "@sveltejs/kit": "svelte",
  "@astrojs/vue": "vue",
  "@astrojs/react": "react",
  "@astrojs/svelte": "svelte",
};

/** Read `package.json` at `root`, if present and parseable. */
export function readPackageJson(root: string): PackageJsonLike | undefined {
  const file = join(root, "package.json");
  if (!existsSync(file)) return undefined;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as PackageJsonLike;
  } catch {
    return undefined;
  }
}

function hasDep(pkg: PackageJsonLike | undefined, name: string): boolean {
  if (!pkg) return false;
  return Boolean(pkg.dependencies?.[name] || pkg.devDependencies?.[name] || pkg.peerDependencies?.[name]);
}

/**
 * Detect the framework of a project directory.
 *
 * Pass `packageJson` to inject parsed package.json contents (tests, or callers
 * that already read it); otherwise it is read from disk.
 */
export function detectFramework(root: string, packageJson?: PackageJsonLike): DetectionResult {
  const pkg = packageJson ?? readPackageJson(root);
  const evidence: string[] = [];
  const scores = new Map<FrameworkName, number>();

  const bump = (fw: FrameworkName, by: number, why: string) => {
    scores.set(fw, (scores.get(fw) ?? 0) + by);
    evidence.push(`${fw}: ${why}`);
  };

  // 1. Framework config files (strongest — they configure compilation).
  for (const [fw, files] of Object.entries(CONFIG_FILES)) {
    const found = files.find((file) => existsSync(join(root, file)));
    if (found) bump(fw as FrameworkName, 5, `found ${found}`);
  }

  // 2. Dependencies. The core framework dependency is a strong signal;
  // renderers embedded into another framework are weaker.
  for (const [dep, fw] of Object.entries(DEP_FRAMEWORKS)) {
    if (!hasDep(pkg, dep)) continue;
    const strength = dep === fw ? 3 : dep === "next" || dep.startsWith("@astrojs/") || dep.startsWith("@sveltejs/") ? 2 : 1;
    bump(fw, strength, `dependency "${dep}"`);
  }

  // 3. Telltale files.
  const fileSignals: Array<[FrameworkName, string]> = [
    ["svelte", "src/App.svelte"],
    ["svelte", "src/routes"],
    ["vue", "src/App.vue"],
    ["vue", "app.vue"],
    ["vue", "pages"],
    ["astro", "src/pages"],
    ["react", "src/App.tsx"],
    ["react", "src/app"],
  ];
  for (const [fw, file] of fileSignals) {
    if (existsSync(join(root, file))) bump(fw, 1, `found ${file}`);
  }

  if (scores.size === 0) {
    return { framework: undefined, confidence: "unknown", evidence };
  }

  const ranked = [...scores.entries()].sort((a, b) => b[1] - a[1]);
  const [top, topScore] = ranked[0]!;
  const second = ranked[1];
  const margin = topScore - (second?.[1] ?? 0);

  // A score below 3 comes from weak signals only (a stray dep or file) —
  // treat that as a guess the caller should confirm.
  const confidence: DetectionConfidence =
    topScore >= 5 || margin >= 3 ? "certain" : topScore >= 3 ? "probable" : "unknown";

  return { framework: confidence === "unknown" ? undefined : top, confidence, evidence };
}
