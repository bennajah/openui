import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectFramework, readPackageJson } from "../src/index.ts";

function project(files: Record<string, string>): string {
  const root = mkdtempSync(join(tmpdir(), "openui-detect-"));
  for (const [rel, content] of Object.entries(files)) {
    const file = join(root, rel);
    mkdirSync(join(file, ".."), { recursive: true });
    writeFileSync(file, content);
  }
  return root;
}

const pkg = (deps: Record<string, string>) => JSON.stringify({ dependencies: deps });

describe("detectFramework", () => {
  test("detects Astro from astro.config.mjs", () => {
    const root = project({ "astro.config.mjs": "export default {}" });
    try {
      const result = detectFramework(root);
      expect(result.framework).toBe("astro");
      expect(result.confidence).toBe("certain");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("detects Svelte from svelte.config.js plus the svelte dependency", () => {
    const root = project({
      "svelte.config.js": "export default {}",
      "package.json": pkg({ svelte: "^5.0.0" }),
    });
    try {
      const result = detectFramework(root);
      expect(result.framework).toBe("svelte");
      expect(result.confidence).toBe("certain");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("detects Vue from the vue dependency and App.vue", () => {
    const root = project({
      "package.json": pkg({ vue: "^3.5.0", vite: "^7.0.0" }),
      "src/App.vue": "<template><div /></template>",
    });
    try {
      const result = detectFramework(root);
      expect(result.framework).toBe("vue");
      expect(result.confidence).toBe("certain");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("detects React from react + react-dom", () => {
    const root = project({ "package.json": pkg({ react: "^19.0.0", "react-dom": "^19.0.0" }) });
    try {
      const result = detectFramework(root);
      expect(result.framework).toBe("react");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("a Next.js project resolves to react", () => {
    const root = project({ "next.config.mjs": "export default {}", "package.json": pkg({ next: "^16.0.0" }) });
    try {
      expect(detectFramework(root).framework).toBe("react");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("build-tool config beats embedded renderers (Astro + Svelte)", () => {
    const root = project({
      "astro.config.mjs": 'import svelte from "@astrojs/svelte"; export default { integrations: [svelte()] }',
      "package.json": pkg({ astro: "^7.0.0", "@astrojs/svelte": "^6.0.0", svelte: "^5.0.0" }),
    });
    try {
      const result = detectFramework(root);
      expect(result.framework).toBe("astro");
      expect(result.confidence).toBe("certain");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("an empty project is unknown", () => {
    const root = project({});
    try {
      const result = detectFramework(root);
      expect(result.framework).toBeUndefined();
      expect(result.confidence).toBe("unknown");
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  test("accepts an injected package.json (no disk read needed)", () => {
    const result = detectFramework("/nonexistent", { dependencies: { vue: "^3.5.0" } });
    expect(result.framework).toBe("vue");
  });

  test("readPackageJson tolerates missing or broken package.json", () => {
    const root = project({ "package.json": "{ broken" });
    try {
      expect(readPackageJson(root)).toBeUndefined();
      expect(readPackageJson(join(root, "nope"))).toBeUndefined();
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
