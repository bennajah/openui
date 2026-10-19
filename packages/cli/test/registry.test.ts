import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { buildRegistry, loadManifest, toJsx, writeRegistry } from "../src/commands/build.ts";
import { runAdd } from "../src/commands/add.ts";
import { runValidate } from "../src/commands/validate.ts";
import { createProject, makeTempDir, writeJson } from "./helpers.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");

describe("registry build", () => {
  it("builds one item per framework and a validated index", () => {
    const manifest = loadManifest(REPO_ROOT);
    const result = buildRegistry(REPO_ROOT, manifest);

    const componentNames = manifest.components.map((c) => c.name);
    // oxlint-disable-next-line unicorn/no-array-sort -- freshly built array, safe to sort.
    expect(Object.keys(result.index.components).sort()).toEqual(componentNames.sort());

    const expectedItems = componentNames
      .flatMap((name) => ["react", "svelte", "astro", "vue"].map((fw) => `r/${name}-${fw}.json`))
      // oxlint-disable-next-line unicorn/no-array-sort -- freshly built array, safe to sort.
      .sort();
    // oxlint-disable-next-line unicorn/no-array-sort -- freshly built array, safe to sort.
    expect([...result.items.keys()].sort()).toEqual(expectedItems);

    const react = result.items.get("r/button-react.json");
    // oxlint-disable-next-line unicorn/no-array-sort -- freshly built array, safe to sort.
    expect(react?.files.map((f) => f.target).sort()).toEqual([
      "{ui}/button.jsx",
      "{ui}/button.tsx",
    ]);

    // Every component ships exactly one React item with a TSX and a JSX variant.
    const reactField = result.items.get("r/field-react.json");
    expect(reactField?.files.map((f) => f.target)).toContain("{ui}/field.jsx");
  });

  it("transpiles TSX to JSX without type annotations", () => {
    const source = readFileSync(join(REPO_ROOT, "packages/react/src/button.tsx"), "utf8");
    const jsx = toJsx(source, "button.tsx");
    expect(jsx).not.toContain("interface ButtonProps");
    expect(jsx).not.toContain(": ButtonProps");
    expect(jsx).toContain("export function Button");
    expect(jsx).toContain("return");
  });

  it("writes a registry that validates and prunes stale items", () => {
    const dir = makeTempDir();
    const manifest = loadManifest(REPO_ROOT);
    const result = buildRegistry(REPO_ROOT, manifest);
    const written = writeRegistry(dir, manifest, result);
    // index.json + one item per component per framework.
    expect(written.length).toBe(1 + manifest.components.length * 4);

    // A stale item from a previous build is removed, not left behind.
    writeJson(join(dir, "registry/r/stale-react.json"), { name: "stale" });
    writeRegistry(dir, manifest, result);
    expect(existsSync(join(dir, "registry/r/stale-react.json"))).toBe(false);
  });
});

describe("registry integration", () => {
  it("installs the real Button into all four frameworks via the CLI", async () => {
    const registryRoot = makeTempDir();
    const manifest = loadManifest(REPO_ROOT);
    writeRegistry(registryRoot, manifest, buildRegistry(REPO_ROOT, manifest));

    const cases = [
      ["react", "src/components/ui/button.tsx", "packages/react/src/button.tsx", true],
      ["svelte", "src/components/ui/button.svelte", "packages/svelte/src/button.svelte", false],
      ["astro", "src/components/ui/button.astro", "packages/astro/src/button.astro", false],
      ["vue", "src/components/ui/button.vue", "packages/vue/src/button.vue", false],
    ] as const;

    for (const [framework, target, source, typescript] of cases) {
      const root = createProject({
        framework,
        typescript,
        registry: { url: join(registryRoot, "registry") },
      });
      // oxlint-disable-next-line no-await-in-loop -- each framework is an isolated project.
      const outcome = await runAdd({ components: ["button"], cwd: root });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) throw new Error(`expected success for ${framework}`);
      expect(outcome.summary.installed).toEqual([target]);
      expect(readFileSync(join(root, target), "utf8")).toBe(
        readFileSync(join(REPO_ROOT, source), "utf8"),
      );
      // oxlint-disable-next-line no-await-in-loop -- validation pairs with the install above.
      const validation = await runValidate({ cwd: root });
      expect(validation.errors).toEqual([]);
    }
  });

  it("installs the generated JSX variant into JavaScript React projects", async () => {
    const registryRoot = makeTempDir();
    const manifest = loadManifest(REPO_ROOT);
    writeRegistry(registryRoot, manifest, buildRegistry(REPO_ROOT, manifest));

    const root = createProject({
      framework: "react",
      typescript: false,
      registry: { url: join(registryRoot, "registry") },
    });
    const outcome = await runAdd({ components: ["button"], cwd: root });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected success");

    const content = readFileSync(join(root, "src/components/ui/button.jsx"), "utf8");
    expect(content).toContain("export function Button");
    expect(content).not.toContain("ButtonProps");
  });

  it("installs every form component into every framework via the CLI", async () => {
    const registryRoot = makeTempDir();
    const manifest = loadManifest(REPO_ROOT);
    writeRegistry(registryRoot, manifest, buildRegistry(REPO_ROOT, manifest));

    const components = ["input", "textarea", "select", "checkbox", "radio", "label", "field"];
    const ext = { react: "tsx", svelte: "svelte", astro: "astro", vue: "vue" } as const;

    for (const framework of ["react", "svelte", "astro", "vue"] as const) {
      const root = createProject({
        framework,
        typescript: true,
        registry: { url: join(registryRoot, "registry") },
      });
      // oxlint-disable-next-line no-await-in-loop -- each framework is an isolated project.
      const outcome = await runAdd({ components, cwd: root });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) throw new Error(`expected success for ${framework}`);

      for (const name of components) {
        const installed = join(root, `src/components/ui/${name}.${ext[framework]}`);
        const canonical = join(REPO_ROOT, `packages/${framework}/src/${name}.${ext[framework]}`);
        expect(existsSync(installed)).toBe(true);
        expect(readFileSync(installed, "utf8")).toBe(readFileSync(canonical, "utf8"));
      }

      // oxlint-disable-next-line no-await-in-loop -- validation pairs with the install above.
      const validation = await runValidate({ cwd: root });
      expect(validation.errors).toEqual([]);
    }
  });

  it("installs theme and rewrites sibling imports for JavaScript projects", async () => {
    const registryRoot = makeTempDir();
    const manifest = loadManifest(REPO_ROOT);
    writeRegistry(registryRoot, manifest, buildRegistry(REPO_ROOT, manifest));

    for (const framework of ["react", "svelte", "astro", "vue"] as const) {
      const root = createProject({
        framework,
        typescript: false,
        registry: { url: join(registryRoot, "registry") },
      });
      // oxlint-disable-next-line no-await-in-loop -- each framework is an isolated project.
      const outcome = await runAdd({ components: ["theme"], cwd: root });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) throw new Error(`expected success for ${framework}`);

      const ui = join(root, "src/components/ui");
      // The plain TypeScript module becomes a JavaScript sibling.
      expect(existsSync(join(ui, "theme.js"))).toBe(true);
      expect(existsSync(join(ui, "theme.ts"))).toBe(false);
    }

    // React additionally rewrites the component's import to the JS variant.
    const reactRoot = createProject({
      framework: "react",
      typescript: false,
      registry: { url: join(registryRoot, "registry") },
    });
    // oxlint-disable-next-line no-await-in-loop -- validation pairs with the install above.
    expect((await runAdd({ components: ["theme"], cwd: reactRoot })).ok).toBe(true);
    const toggle = readFileSync(join(reactRoot, "src/components/ui/theme-toggle.jsx"), "utf8");
    expect(toggle).toContain('from "./theme.js"');
    expect(toggle).not.toContain('from "./theme.ts"');
  });
});
