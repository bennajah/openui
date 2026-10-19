import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transform } from "@astrojs/compiler-rs";

const SOURCE = readFileSync(join(import.meta.dir, "../src/button.astro"), "utf8");

describe("Button (Astro)", () => {
  it("compiles without diagnostics", async () => {
    const result = await transform(SOURCE, { filename: "button.astro" });
    expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
    expect(result.code).toContain("<button");
  });

  it("emits the expected classes and slot", async () => {
    const result = await transform(SOURCE, { filename: "button.astro" });
    expect(result.code).toContain("bg-zinc-900");
    expect(result.code).toContain("h-10");
    expect(result.code).toContain("slot");
  });

  it("stays plain JavaScript for JavaScript projects", () => {
    expect(SOURCE).not.toContain('<script lang="ts"');
    expect(SOURCE).not.toContain('---\nlang="ts"');
    expect(SOURCE).toContain("Astro.props");
  });
});
