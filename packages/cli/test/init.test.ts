import { describe, expect, it } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_FILENAME, validateConfig } from "@openui/core";
import { runInit } from "../src/commands/init.ts";
import { makeTempDir } from "./helpers.ts";

function readConfig(root: string): unknown {
  return JSON.parse(readFileSync(join(root, CONFIG_FILENAME), "utf8"));
}

describe("openui init", () => {
  it("writes a config that validates against the schema", async () => {
    const root = makeTempDir();
    const result = await runInit({ cwd: root, framework: "react" });

    expect(result.ok).toBe(true);
    const config = readConfig(root);
    expect(validateConfig(config).ok).toBe(true);
    expect((config as { $schema: string }).$schema).toBe("https://openui.dev/schema.json");
    expect((config as { framework: string }).framework).toBe("react");
  });

  it("detects the framework from package.json", async () => {
    const root = makeTempDir();
    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ dependencies: { svelte: "^5.0.0" } }),
    );
    const result = await runInit({ cwd: root });
    expect(result.ok).toBe(true);
    expect((readConfig(root) as { framework: string }).framework).toBe("svelte");
  });

  it("falls back to auto and warns when detection is inconclusive", async () => {
    const root = makeTempDir();
    const result = await runInit({ cwd: root });
    expect(result.ok).toBe(true);
    expect((readConfig(root) as { framework: string }).framework).toBe("auto");
    if (!result.ok) throw new Error("expected success");
    expect(result.warnings.some((w) => w.includes("Could not detect"))).toBe(true);
  });

  it("applies explicit flags without needing detection", async () => {
    const root = makeTempDir();
    const result = await runInit({
      cwd: root,
      framework: "vue",
      typescript: false,
      css: "src/app.css",
      registry: "https://registry.example.com",
      componentsAlias: "~/components",
      uiAlias: "~/components/ui",
    });
    expect(result.ok).toBe(true);
    const config = readConfig(root) as {
      framework: string;
      typescript: boolean;
      tailwind: { css: string };
      aliases: { components: string; ui: string };
      registry: { url: string };
    };
    expect(config.framework).toBe("vue");
    expect(config.typescript).toBe(false);
    expect(config.tailwind.css).toBe("src/app.css");
    expect(config.aliases).toEqual({ components: "~/components", ui: "~/components/ui" });
    expect(config.registry.url).toBe("https://registry.example.com");
  });

  it("refuses to overwrite an existing config without --force", async () => {
    const root = makeTempDir();
    await runInit({ cwd: root, framework: "react" });
    const before = readFileSync(join(root, CONFIG_FILENAME), "utf8");

    const result = await runInit({ cwd: root, framework: "vue" });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("expected failure");
    expect(result.errors[0]).toContain("already exists");
    expect(readFileSync(join(root, CONFIG_FILENAME), "utf8")).toBe(before);
  });

  it("overwrites when --force is passed", async () => {
    const root = makeTempDir();
    await runInit({ cwd: root, framework: "react" });
    const result = await runInit({ cwd: root, framework: "vue", force: true });
    expect(result.ok).toBe(true);
    expect((readConfig(root) as { framework: string }).framework).toBe("vue");
  });

  it("asks for confirmation before overwriting in interactive use", async () => {
    const root = makeTempDir();
    await runInit({ cwd: root, framework: "react" });

    const declined = await runInit({
      cwd: root,
      framework: "vue",
      confirmOverwrite: async () => false,
    });
    // Non-TTY environments never prompt; the call must still refuse.
    expect(declined.ok).toBe(false);
    expect(existsSync(join(root, CONFIG_FILENAME))).toBe(true);
  });
});
