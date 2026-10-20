import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve } from "node:path";

/**
 * Canonical documentation → LLM docs pipeline.
 *
 * Markdown under `apps/docs/content/docs` is the single source of truth. The
 * files served at `/llms.txt`, `/llms-full.txt`, and `/llms/*.md` are
 * generated, never hand-edited.
 */

export const DOCS_DIR = "apps/docs/content/docs";
export const PUBLIC_DIR = "apps/docs/public";
export const SITE_URL = "https://openuii.vercel.app";

/**
 * Absolute path to the workspace `oxfmt` binary.
 *
 * `node_modules/.bin` is not on PATH for these scripts, and the docs build
 * bundles this module (so `import.meta.dir` is unreliable), hence the walk up
 * from the current working directory.
 */
function findOxfmt(): string {
  let dir = process.cwd();
  for (let depth = 0; depth < 6; depth++) {
    const candidate = join(dir, "node_modules", ".bin", "oxfmt");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not locate the workspace oxfmt binary.");
}

const oxfmtBinary = findOxfmt();

/** Pages that must always exist (also used by tests and CI). */
export const REQUIRED_SLUGS = [
  "getting-started",
  "configuration",
  "cli",
  "components/index",
  "registry",
  "theming",
  "contributing",
  "frameworks/react",
  "frameworks/svelte",
  "frameworks/astro",
  "frameworks/vue",
  "components/button",
  "components/input",
  "components/textarea",
  "components/select",
  "components/checkbox",
  "components/radio",
  "components/label",
  "components/field",
  "components/theme",
] as const;

export interface DocPage {
  /** Path relative to the docs directory, without `.md` (e.g. `frameworks/react`). */
  slug: string;
  title: string;
  description: string;
  order: number;
  /** Markdown body, frontmatter removed. */
  body: string;
  /** Repository-relative source path. */
  source: string;
}

export interface LlmsOutput {
  /** Relative to the public directory. */
  path: string;
  content: string;
}

function parseScalar(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/** Minimal YAML frontmatter reader: `key: scalar` pairs only. */
export function parseFrontmatter(source: string): {
  data: Record<string, string>;
  body: string;
} {
  if (!source.startsWith("---\n")) return { data: {}, body: source };
  const end = source.indexOf("\n---", 4);
  if (end === -1) return { data: {}, body: source };
  const raw = source.slice(4, end);
  const data: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    if (line.trim() === "" || line.startsWith("#")) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    data[line.slice(0, colon).trim()] = parseScalar(line.slice(colon + 1));
  }
  const bodyStart = source.indexOf("\n", end + 4);
  return { data, body: bodyStart === -1 ? "" : source.slice(bodyStart + 1).trimStart() };
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  // oxlint-disable-next-line unicorn/no-array-sort -- freshly returned array, safe to sort.
  for (const entry of readdirSync(dir).sort()) {
    const absolute = join(dir, entry);
    if (statSync(absolute).isDirectory()) files.push(...walk(absolute));
    else if (entry.endsWith(".md")) files.push(absolute);
  }
  return files;
}

export function docsRoot(root: string): string {
  return resolve(root, DOCS_DIR);
}

/** Read every canonical page, sorted for deterministic output. */
export function readDocPages(root: string): DocPage[] {
  const base = docsRoot(root);
  const pages = walk(base).map((absolute) => {
    const source = relative(root, absolute);
    const slug = relative(base, absolute).replace(/\.md$/, "").split("\\").join("/");
    const parsed = parseFrontmatter(readFileSync(absolute, "utf8"));
    const title = parsed.data.title ?? slug;
    const description = parsed.data.description ?? "";
    const order = Number.parseInt(parsed.data.order ?? "999", 10);
    return {
      slug,
      title,
      description,
      order: Number.isNaN(order) ? 999 : order,
      body: parsed.body,
      source,
    };
  });

  // oxlint-disable-next-line unicorn/no-array-sort -- fresh array built above.
  return pages.sort((a, b) => {
    const aFramework = a.slug.startsWith("frameworks/");
    const bFramework = b.slug.startsWith("frameworks/");
    if (aFramework !== bFramework) return aFramework ? 1 : -1;
    if (a.order !== b.order) return a.order - b.order;
    return a.slug.localeCompare(b.slug);
  });
}

export function docUrl(slug: string): string {
  return `${SITE_URL}/docs/${slug.replace(/\/index$/, "")}`;
}

/** Rewrite site-absolute links to absolute URLs so raw LLM files are portable. */
export function rewriteLinks(markdown: string): string {
  return markdown.replaceAll("](/docs/", `](${SITE_URL}/docs/`);
}

const GENERATED_NOTE =
  "<!-- Generated by `bun run llms:generate` from apps/docs/content/docs. Do not edit. -->";

function pageHeader(page: DocPage): string {
  return `${GENERATED_NOTE}\n\n# ${page.title}\n\nSource: ${docUrl(page.slug)}\n`;
}

/** Strip the leading H1, which `pageHeader` already emitted. */
function stripLeadingTitle(body: string): string {
  return body.replace(/^#\s+.*(?:\r?\n)+/, "");
}

export function buildLlms(root: string): LlmsOutput[] {
  const pages = readDocPages(root);
  const outputs: LlmsOutput[] = [];

  for (const page of pages) {
    outputs.push({
      path: `llms/${page.slug}.md`,
      content: `${pageHeader(page)}\n${rewriteLinks(stripLeadingTitle(page.body)).trim()}\n`,
    });
  }
  const isFramework = (slug: string): boolean => slug.startsWith("frameworks/");
  const isComponent = (slug: string): boolean => slug.startsWith("components/");
  const link = (page: DocPage): string =>
    `- [${page.title}](${docUrl(page.slug)}): ${page.description}`;

  const indexLines = [
    "# OpenUI",
    "",
    "> Framework-native UI components installed as source. No runtime dependencies.",
    "",
    "OpenUI writes components directly into your project for React, Svelte, Astro,",
    "and Vue. Components are plain framework code styled with Tailwind CSS v4; the",
    "`openui` CLI handles configuration, installation, and registry validation.",
    "",
    "## Documentation",
    "",
    ...pages.filter((page) => !isFramework(page.slug) && !isComponent(page.slug)).map(link),
    "",
    "## Components",
    "",
    ...pages.filter((page) => isComponent(page.slug)).map(link),
    "",
    "## Frameworks",
    "",
    ...pages.filter((page) => isFramework(page.slug)).map(link),
    "",
    "## Machine-readable",
    "",
    `- [Full documentation](${SITE_URL}/llms-full.txt): Every page in one file.`,
    `- [JSON Schema](${SITE_URL}/schema.json): Schema for \`openui.json\`.`,
    `- [Registry index](${SITE_URL}/registry/index.json): Components and item locations.`,
    "",
    "## Optional",
    "",
    "- [Contributing](https://openuii.vercel.app/docs/contributing): Repository workflow and beta limitations.",
    "",
  ];

  outputs.push({ path: "llms.txt", content: indexLines.join("\n") });

  const full = [
    GENERATED_NOTE,
    "",
    "# OpenUI — full documentation",
    "",
    `> ${pages.length} pages, generated from ${DOCS_DIR}.`,
    "",
    ...pages.map(
      (page) =>
        `<!-- ${page.slug} -->\n\n# ${page.title}\n\nSource: ${docUrl(page.slug)}\n\n${rewriteLinks(stripLeadingTitle(page.body)).trim()}`,
    ),
  ];
  outputs.push({ path: "llms-full.txt", content: `${full.join("\n\n---\n\n")}\n` });

  return outputs.map((output) => ({ ...output, content: formatGenerated(output.content) }));
}

/**
 * Normalize generated Markdown with the repository formatter.
 *
 * `oxfmt` rewraps Markdown tables and prose, so raw generator output would
 * disagree with the committed (formatted) files. Formatting here means
 * generation and validation compare identical bytes — one source of truth.
 * Results are memoized because validation rebuilds every page.
 */
export function formatGenerated(content: string): string {
  const cached = formatCache.get(content);
  if (cached !== undefined) return cached;
  const temporary = join(tmpdir(), `openui-llms-${hashString(content)}.md`);
  writeFileSync(temporary, content);
  try {
    execFileSync(oxfmtBinary, [temporary], { stdio: "ignore" });
    const formatted = readFileSync(temporary, "utf8");
    formatCache.set(content, formatted);
    return formatted;
  } finally {
    rmSync(temporary, { force: true });
  }
}

const formatCache = new Map<string, string>();

function hashString(value: string): string {
  let hash = 2_166_136_261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return (hash >>> 0).toString(36);
}

const LINK_PATTERN = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export interface ValidationReport {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

export function checkLinks(
  label: string,
  content: string,
  knownSlugs: Set<string>,
  publicRoot: string,
): string[] {
  const errors: string[] = [];
  for (const match of content.matchAll(LINK_PATTERN)) {
    const target = match[1];
    if (target === undefined) continue;
    if (target.startsWith("#") || target.startsWith("mailto:")) continue;

    if (target.startsWith(`${SITE_URL}/docs/`)) {
      const rest = target.slice(`${SITE_URL}/docs/`.length).replace(/\/$/, "").replace(/#.*$/, "");
      // A link to a directory (`/docs/components`) resolves to its index page.
      const slug = knownSlugs.has(rest)
        ? rest
        : knownSlugs.has(`${rest}/index`)
          ? `${rest}/index`
          : rest;
      if (!knownSlugs.has(slug)) {
        errors.push(`${label}: link to unknown docs page "${target}".`);
      }
      continue;
    }
    if (target.startsWith(`${SITE_URL}/`)) continue;
    if (/^https?:\/\//.test(target)) continue;

    if (target.startsWith("/")) {
      // Site-absolute non-doc links (for example /llms.txt) must exist publicly.
      const file = join(publicRoot, target.replace(/^\//, ""));
      if (!existsSync(file) && !target.startsWith("/docs/")) {
        errors.push(`${label}: link to missing public file "${target}".`);
      }
      continue;
    }

    if (target.endsWith(".md")) {
      const base = dirname(join(publicRoot, label));
      const file = resolve(base, target);
      if (!existsSync(file)) {
        errors.push(`${label}: broken relative link "${target}".`);
      }
    }
  }
  return errors;
}

/**
 * Validate the generated LLM docs:
 * - every required page exists and is non-empty;
 * - generated files match their canonical sources (no stale output);
 * - local links resolve;
 * - no obvious secrets.
 */
export function validateLlms(root: string): ValidationReport {
  const publicRoot = resolve(root, PUBLIC_DIR);
  const pages = readDocPages(root);
  const knownSlugs = new Set(pages.map((page) => page.slug));
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const slug of REQUIRED_SLUGS) {
    if (!knownSlugs.has(slug)) {
      errors.push(`Missing canonical page "${DOCS_DIR}/${slug}.md".`);
    }
  }

  const expected = buildLlms(root);
  for (const output of expected) {
    const file = join(publicRoot, output.path);
    if (!existsSync(file)) {
      errors.push(
        `Missing generated file "${PUBLIC_DIR}/${output.path}". Run \`bun run llms:generate\`.`,
      );
      continue;
    }
    const actual = readFileSync(file, "utf8");
    if (actual !== output.content) {
      errors.push(
        `Stale generated file "${PUBLIC_DIR}/${output.path}". Run \`bun run llms:generate\`.`,
      );
    }
    if (actual.trim() === "") {
      errors.push(`Empty generated file "${PUBLIC_DIR}/${output.path}".`);
    }
  }

  for (const output of expected) {
    const label = output.path;
    errors.push(...checkLinks(label, output.content, knownSlugs, publicRoot));
    if (/-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(output.content)) {
      errors.push(`${label}: contains a private key.`);
    }
    if (/\b(sk|pk)_(live|test)_[A-Za-z0-9]{8,}/.test(output.content)) {
      errors.push(`${label}: contains what looks like an API secret key.`);
    }
  }

  for (const page of pages) {
    if (page.description.trim() === "") {
      warnings.push(`${page.source}: missing frontmatter description (used by llms.txt).`);
    }
  }

  return { ok: errors.length === 0, errors, warnings };
}
