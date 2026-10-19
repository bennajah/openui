import { describe, expect, it } from "bun:test";
import { rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { runDiff } from "../src/commands/diff.ts";
import { runList } from "../src/commands/list.ts";
import { runAdd } from "../src/commands/add.ts";
import { runValidate } from "../src/commands/validate.ts";
import { createProject, createRegistry, makeTempDir } from "./helpers.ts";

describe("openui list", () => {
  it("reads components from the configured registry", async () => {
    const root = createProject();
    createRegistry(root);
    const outcome = await runList({ cwd: root });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) throw new Error("expected success");
    expect(outcome.index.name).toBe("fixture");
    expect(Object.keys(outcome.index.components)).toEqual(["button"]);
    expect(Object.keys(outcome.index.components.button?.frameworks ?? {})).toEqual([
      "react",
      "svelte",
      "astro",
      "vue",
    ]);
  });

  it("supports a registry override", async () => {
    const root = createProject();
    const elsewhere = makeTempDir();
    createRegistry(elsewhere, "vendor/registry");
    const outcome = await runList({
      cwd: root,
      registry: join(elsewhere, "vendor/registry"),
    });
    expect(outcome.ok).toBe(true);
  });

  it("reports a missing registry with a clear error", async () => {
    const root = createProject();
    const outcome = await runList({ cwd: root });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("expected failure");
    expect(outcome.errors[0]).toContain("Registry file not found");
  });
});

describe("openui validate", () => {
  it("validates the config and every registry item", async () => {
    const root = createProject();
    createRegistry(root);
    const outcome = await runValidate({ cwd: root });
    expect(outcome.ok).toBe(true);
    expect(outcome.checked.some((f) => f.endsWith("openui.json"))).toBe(true);
    expect(outcome.checked.some((f) => f.endsWith("button-vue.json"))).toBe(true);
  });

  it("fails when an item referenced by the index is missing", async () => {
    const root = createProject();
    const registry = createRegistry(root);
    rmSync(join(registry, "r/button-svelte.json"));
    const outcome = await runValidate({ cwd: root });
    expect(outcome.ok).toBe(false);
    expect(outcome.errors.some((e) => e.includes("button-svelte.json"))).toBe(true);
  });

  it("fails when the config is invalid", async () => {
    const root = makeTempDir();
    writeFileSync(join(root, "openui.json"), JSON.stringify({ framework: "angular" }));
    const outcome = await runValidate({ cwd: root });
    expect(outcome.ok).toBe(false);
    expect(outcome.errors.length).toBeGreaterThan(0);
  });
});

describe("openui diff", () => {
  it("reports missing, in-sync, and locally modified files", async () => {
    const root = createProject();
    createRegistry(root);

    const before = await runDiff({ component: "button", cwd: root });
    expect(before.ok).toBe(true);
    if (!before.ok) throw new Error("expected success");
    expect(before.entries[0]?.status).toBe("missing");

    await runAdd({ components: ["button"], cwd: root });
    const synced = await runDiff({ component: "button", cwd: root });
    expect(synced.ok).toBe(true);
    if (!synced.ok) throw new Error("expected success");
    expect(synced.entries[0]?.status).toBe("in-sync");

    writeFileSync(join(root, "src/components/ui/button.tsx"), "// tweaked\n");
    const modified = await runDiff({ component: "button", cwd: root });
    expect(modified.ok).toBe(true);
    if (!modified.ok) throw new Error("expected success");
    expect(modified.entries[0]?.status).toBe("modified");
    expect(modified.entries[0]?.diff).toContain("// tweaked");
  });

  it("reports an unknown component", async () => {
    const root = createProject();
    createRegistry(root);
    const outcome = await runDiff({ component: "nope", cwd: root });
    expect(outcome.ok).toBe(false);
    if (outcome.ok) throw new Error("expected failure");
    expect(outcome.errors[0]).toContain("Unknown component");
  });
});
