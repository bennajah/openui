import { describe, expect, it } from "bun:test";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  committedRegistryDir,
  FRAMEWORKS,
  readComponent,
  readMainSource,
  readSources,
} from "../src/lib/registry.ts";
import { parseFrontmatter, readDocPages } from "../../../scripts/lib/docs.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");
const REGISTRY = committedRegistryDir(REPO_ROOT);
const COMPONENT_DOCS = join(REPO_ROOT, "apps/docs/content/docs/components");
const DEMOS_DIR = join(REPO_ROOT, "apps/docs/src/components/demos");

describe("component docs coverage", () => {
  it("documents every registry component", () => {
    const documented = new Set(
      readdirSync(COMPONENT_DOCS)
        .filter((file) => file.endsWith(".md") && file !== "index.md")
        .map((file) => file.replace(/\.md$/, "")),
    );
    const indexed = readdirSync(join(REGISTRY, "r"))
      .map((file) => /^(.+)-(react|svelte|astro|vue)\.json$/.exec(file)?.[1])
      .filter((name): name is string => name !== undefined);

    for (const name of new Set(indexed)) {
      expect(documented.has(name)).toBe(true);
    }
  });

  it("points every component page at a real registry component and demo", () => {
    const demoMap = readFileSync(join(REPO_ROOT, "apps/docs/src/components/Demo.astro"), "utf8");
    const registered = [...demoMap.matchAll(/"([a-z-]+)":\s*\{\s*Component:/g)].map((m) => m[1]!);
    expect(registered.length).toBeGreaterThan(0);

    // Every demo component file must be imported by the dispatcher, so a demo
    // cannot exist on disk yet be unreachable from a page.
    for (const file of readdirSync(DEMOS_DIR)) {
      const name = file.replace(/\.astro$/, "");
      expect(demoMap).toContain(`./demos/${name}.astro`);
      expect(demoMap).toMatch(new RegExp(`import ${name} from "\\./demos/${name}\\.astro";`));
    }

    for (const page of readDocPages(REPO_ROOT)) {
      if (!page.slug.startsWith("components/") || page.slug === "components/index") continue;
      const { data } = parseFrontmatter(readFileSync(join(REPO_ROOT, page.source), "utf8"));
      expect(data.component).toBe(page.slug.replace("components/", ""));
      expect(data.demo).toBeDefined();
      expect(registered).toContain(data.demo!);
    }
  });

  it("resolves canonical source for every component in every framework", () => {
    const index = JSON.parse(readFileSync(join(REGISTRY, "index.json"), "utf8")) as {
      components: Record<string, unknown>;
    };
    for (const component of Object.keys(index.components)) {
      for (const framework of FRAMEWORKS) {
        const source = readMainSource(component, framework, REGISTRY);
        expect(source.content.length).toBeGreaterThan(0);
        expect(existsSync(join(REPO_ROOT, source.path))).toBe(true);
      }
    }
  });

  it("prefers TypeScript-authoring variants for the source panel", () => {
    // The Theme item also ships a `.ts` runtime module; both must appear.
    const themeSources = readSources("theme", "react", REGISTRY).map((file) => file.target);
    expect(themeSources).toContain("{ui}/theme-toggle.tsx");
    expect(themeSources).toContain("{ui}/theme.ts");
    // JS siblings are install-time variants and must stay out of the docs panel.
    expect(themeSources.some((target) => target.endsWith(".js") || target.endsWith(".jsx"))).toBe(
      false,
    );
  });

  it("exposes metadata the docs tables rely on", () => {
    const button = readComponent("button", REGISTRY);
    expect(button.title).toBe("Button");
    expect(button.description.length).toBeGreaterThan(0);
    const index = JSON.parse(readFileSync(join(REGISTRY, "index.json"), "utf8")) as {
      components: Record<string, { meta?: { props?: unknown[] } }>;
    };
    expect(index.components.button?.meta?.props?.length).toBeGreaterThan(0);
  });
});
