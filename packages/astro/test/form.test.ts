import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { transform } from "@astrojs/compiler-rs";

const COMPONENTS = ["input", "textarea", "select", "checkbox", "radio", "label", "field"] as const;

function source(name: string): string {
  return readFileSync(join(import.meta.dir, `../src/${name}.astro`), "utf8");
}

async function compile(name: string) {
  return transform(source(name), { filename: `${name}.astro` });
}

describe("form components (Astro)", () => {
  it("all compile without diagnostics", async () => {
    const results = await Promise.all(COMPONENTS.map((name) => compile(name)));
    for (const result of results) {
      expect(result.diagnostics.filter((d) => d.severity === "error")).toEqual([]);
      expect(result.code.length).toBeGreaterThan(0);
    }
  });

  it("Input emits field styling and props", async () => {
    const result = await compile("input");
    expect(result.code).toContain("<input");
    expect(result.code).toContain("h-10");
    expect(result.code).toContain("Astro.props");
    expect(result.code).toContain("aria-invalid");
  });

  it("Textarea emits a textarea with a default row count", async () => {
    const result = await compile("textarea");
    expect(result.code).toContain("<textarea");
    expect(result.code).toContain("rows");
  });

  it("Select wraps the select and draws a chevron", async () => {
    const result = await compile("select");
    expect(result.code).toContain("<select");
    expect(result.code).toContain("appearance-none");
    expect(result.code).toContain("svg");
    expect(result.code).toContain("slot");
  });

  it("Checkbox and Radio keep their native types", async () => {
    expect((await compile("checkbox")).code).toContain('type="checkbox"');
    expect((await compile("radio")).code).toContain('type="radio"');
  });

  it("Label renders a label with a default slot", async () => {
    const result = await compile("label");
    expect(result.code).toContain("<label");
    expect(result.code).toContain("slot");
  });

  it("Field exposes the generated control id and description target", async () => {
    const result = await compile("field");
    expect(result.code).toContain("data-control-id");
    expect(result.code).toContain("data-described-by");
    expect(result.code).toContain("for");
  });

  it("stays plain JavaScript so JavaScript projects can install it", () => {
    for (const name of COMPONENTS) {
      const src = source(name);
      expect(src).not.toContain('<script lang="ts"');
      expect(src).toContain("Astro.props");
    }
  });
});
