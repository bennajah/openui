import { describe, expect, it } from "bun:test";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runAdd } from "../src/commands/add.ts";
import { createProject, createRegistry, makeTempDir } from "./helpers.ts";

describe("openui add", () => {
  it("installs the TypeScript React variant only", async () => {
    const root = createProject({ framework: "react", typescript: true });
    createRegistry(root);

    const outcome = await runAdd({ components: ["button"], cwd: root });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected success");

    expect(outcome.summary.installed).toEqual(["src/components/ui/button.tsx"]);
    expect(existsSync(join(root, "src/components/ui/button.jsx"))).toBe(false);
    expect(readFileSync(join(root, "src/components/ui/button.tsx"), "utf8")).toContain(
      "JSX.Element",
    );
  });

  it("installs the JavaScript variant for JavaScript projects", async () => {
    const root = createProject({ framework: "react", typescript: false });
    createRegistry(root);

    const outcome = await runAdd({ components: ["button"], cwd: root });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected success");

    expect(outcome.summary.installed).toEqual(["src/components/ui/button.jsx"]);
    expect(existsSync(join(root, "src/components/ui/button.tsx"))).toBe(false);
  });

  it("installs every framework's native Button", async () => {
    const cases = [
      ["react", "src/components/ui/button.tsx"],
      ["svelte", "src/components/ui/button.svelte"],
      ["astro", "src/components/ui/button.astro"],
      ["vue", "src/components/ui/button.vue"],
    ] as const;

    for (const [framework, expected] of cases) {
      const root = createProject({ framework });
      createRegistry(root);
      // oxlint-disable-next-line no-await-in-loop -- cases are independent fixtures.
      const outcome = await runAdd({ components: ["button"], cwd: root });
      expect(outcome.ok).toBe(true);
      if (!outcome.ok) throw new Error(`expected success for ${framework}`);
      expect(outcome.summary.installed).toEqual([expected]);
      expect(existsSync(join(root, expected))).toBe(true);
    }
  });

  it("honors the --framework override without rewriting openui.json", async () => {
    const root = createProject({ framework: "react" });
    createRegistry(root);

    const outcome = await runAdd({ components: ["button"], cwd: root, framework: "vue" });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected success");
    expect(outcome.summary.installed).toEqual(["src/components/ui/button.vue"]);
    expect(JSON.parse(readFileSync(join(root, "openui.json"), "utf8")).framework).toBe("react");
  });

  it("writes nothing in dry-run mode", async () => {
    const root = createProject();
    createRegistry(root);

    const outcome = await runAdd({ components: ["button"], cwd: root, dryRun: true });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected success");
    expect(outcome.summary.planned).toEqual(["src/components/ui/button.tsx"]);
    expect(outcome.summary.installed).toEqual([]);
    expect(existsSync(join(root, "src/components/ui/button.tsx"))).toBe(false);
  });

  it("skips existing files and replaces them only with overwrite", async () => {
    const root = createProject();
    createRegistry(root);
    const target = join(root, "src/components/ui/button.tsx");
    mkdirSync(join(root, "src/components/ui"), { recursive: true });
    writeFileSync(target, "// local edit\n");

    const skipped = await runAdd({ components: ["button"], cwd: root });
    expect(skipped.ok).toBe(true);
    if (!skipped.ok) throw new Error("expected success");
    expect(skipped.summary.skipped).toEqual(["src/components/ui/button.tsx"]);
    expect(readFileSync(target, "utf8")).toBe("// local edit\n");

    const replaced = await runAdd({ components: ["button"], cwd: root, overwrite: true });
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) throw new Error("expected success");
    expect(readFileSync(target, "utf8")).toContain("JSX.Element");
  });

  it("finds openui.json in a parent directory", async () => {
    const root = createProject();
    createRegistry(root);
    const nested = join(root, "apps/web/src");
    mkdirSync(nested, { recursive: true });

    const outcome = await runAdd({ components: ["button"], cwd: nested });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected success");
    expect(existsSync(join(root, "src/components/ui/button.tsx"))).toBe(true);
  });

  it("fails with actionable errors for unknown components and missing config", async () => {
    const root = createProject();
    createRegistry(root);

    const unknown = await runAdd({ components: ["nope"], cwd: root });
    expect(unknown.ok).toBe(false);
    if (unknown.ok) throw new Error("expected failure");
    expect(unknown.errors[0]).toContain("Unknown component");
    expect(unknown.errors[0]).toContain("button");

    const empty = makeTempDir();
    const noConfig = await runAdd({ components: ["button"], cwd: empty });
    expect(noConfig.ok).toBe(false);
    if (noConfig.ok) throw new Error("expected failure");
    expect(noConfig.errors[0]).toContain("openui init");
  });

  it("refuses registry items whose targets escape the project root", async () => {
    const root = createProject();
    const registry = createRegistry(root);
    const itemPath = join(registry, "r/button-react.json");
    const item = JSON.parse(readFileSync(itemPath, "utf8"));
    item.files[0].target = "{ui}/../../../../escape.tsx";
    writeFileSync(itemPath, JSON.stringify(item));

    const outcome = await runAdd({ components: ["button"], cwd: root });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("expected failure");
    expect(outcome.errors[0]).toContain("Refusing to write outside the project");
  });
});
