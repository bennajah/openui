import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  applyOverrides,
  DEFAULT_CONFIG,
  EXAMPLE_CONFIG,
  findConfigPath,
  levenshtein,
  loadConfig,
  mergeConfig,
  validateConfig,
} from "../src/index.ts";

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "openui-core-config-"));
}

describe("validateConfig", () => {
  test("accepts the documented example config and applies it verbatim", () => {
    const result = validateConfig(EXAMPLE_CONFIG);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config).toEqual(EXAMPLE_CONFIG);
    expect(result.warnings).toEqual([]);
  });

  test("an empty object yields full defaults", () => {
    const result = validateConfig({});
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config.framework).toBe(DEFAULT_CONFIG.framework);
    expect(result.config.typescript).toBe(true);
    expect(result.config.tailwind).toEqual(DEFAULT_CONFIG.tailwind);
    expect(result.config.aliases).toEqual(DEFAULT_CONFIG.aliases);
    expect(result.config.registry).toEqual(DEFAULT_CONFIG.registry);
  });

  test("rejects non-objects with an actionable message", () => {
    for (const bad of [null, [], "config", 42]) {
      const result = validateConfig(bad);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.errors[0]!).toContain("must contain a JSON object");
    }
  });

  test("rejects an invalid framework and lists the allowed values", () => {
    const result = validateConfig({ framework: "reactt" });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain('"react"');
    expect(result.errors[0]).toContain('"svelte"');
    expect(result.errors[0]).toContain("reactt");
  });

  test("rejects wrong types with the JSON path named", () => {
    const result = validateConfig({
      typescript: "yes",
      tailwind: { css: 42 },
      aliases: { ui: "" },
      registry: { url: "   " },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const text = result.errors.join("\n");
    expect(text).toContain("typescript:");
    expect(text).toContain("tailwind.css:");
    expect(text).toContain("aliases.ui:");
    expect(text).toContain("registry.url:");
  });

  test("rejects alias values that are not path-like", () => {
    const result = validateConfig({ aliases: { components: "components" } });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain('"@/"');
  });

  test("warns about unknown fields but preserves the config as valid", () => {
    const result = validateConfig({ framework: "react", futureTool: { enabled: true } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.join()).toContain('Unknown field "futureTool"');
    expect(result.config.framework).toBe("react");
  });

  test("suggests corrections for typo'd fields", () => {
    const result = validateConfig({ framwork: "react" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.warnings.join()).toContain('Did you mean "framework"?');
  });

  test("levenshtein distances are sane", () => {
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("framework", "framework")).toBe(0);
    expect(levenshtein("framwork", "framework")).toBe(1);
  });
});

describe("mergeConfig", () => {
  test("preserves unknown fields and deep-merges known objects", () => {
    const existing = {
      framework: "react",
      customSection: { a: 1 },
      tailwind: { css: "src/tw.css", prefix: "" },
    };
    const merged = mergeConfig(existing, { tailwind: { css: "src/global.css" }, typescript: false });
    expect(merged).toEqual({
      framework: "react",
      customSection: { a: 1 },
      tailwind: { css: "src/global.css", prefix: "" },
      typescript: false,
    });
  });

  test("ignores undefined patch values", () => {
    expect(mergeConfig({ a: 1 }, { a: undefined })).toEqual({ a: 1 });
  });
});

describe("loadConfig", () => {
  test("discovers openui.json in a parent directory", () => {
    const root = tempDir();
    const child = join(root, "packages", "web");
    mkdirSync(child, { recursive: true });
    writeFileSync(join(root, "openui.json"), JSON.stringify({ framework: "svelte" }));
    try {
      const result = loadConfig({ cwd: child });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.root).toBe(root);
      expect(result.value.config.framework).toBe("svelte");
      expect(findConfigPath(child)).toBe(join(root, "openui.json"));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("reports a helpful error when no config exists", () => {
    const root = tempDir();
    try {
      const result = loadConfig({ cwd: root });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors[0]).toContain("openui init");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an explicit missing config path is an error, never silently ignored", () => {
    const root = tempDir();
    try {
      const result = loadConfig({ cwd: root, configPath: "configs/openui.json" });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors[0]).toContain("Config file not found");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("invalid JSON reports the parse failure with the file name", () => {
    const root = tempDir();
    try {
      writeFileSync(join(root, "openui.json"), "{ nope");
      const result = loadConfig({ cwd: root });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors[0]).toContain("not valid JSON");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("unknown fields load with warnings and keep raw data available", () => {
    const root = tempDir();
    try {
      writeFileSync(
        join(root, "openui.json"),
        JSON.stringify({ framework: "vue", plugins: ["x"] }),
      );
      const result = loadConfig({ cwd: root });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.value.warnings.join()).toContain('Unknown field "plugins"');
      expect(result.value.raw.plugins).toEqual(["x"]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("applyOverrides", () => {
  test("CLI flags win over the file config without mutating it", () => {
    const config = validateConfig({ framework: "auto" });
    expect(config.ok).toBe(true);
    if (!config.ok) return;
    const overridden = applyOverrides(config.config, { framework: "vue", typescript: false });
    expect(overridden.framework).toBe("vue");
    expect(overridden.typescript).toBe(false);
    expect(config.config.framework).toBe("auto"); // original untouched
    expect(overridden.registry.url).toBe(config.config.registry.url);
  });
});
