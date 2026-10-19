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
    const result = buildRegistry(REPO_ROOT, loadManifest(REPO_ROOT));

    expect(Object.keys(result.index.components)).toContain("button");
    // oxlint-disable-next-line unicorn/no-array-sort -- freshly built array, safe to sort.
    expect([...result.items.keys()].sort()).toEqual([
      "r/button-astro.json",
      "r/button-react.json",
      "r/button-svelte.json",
      "r/button-vue.json",
    ]);

    const react = result.items.get("r/button-react.json");
    // oxlint-disable-next-line unicorn/no-array-sort -- freshly built array, safe to sort.
    expect(react?.files.map((f) => f.target).sort()).toEqual([
      "{ui}/button.jsx",
      "{ui}/button.tsx",
    ]);
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
    expect(written.length).toBe(5);

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
});
