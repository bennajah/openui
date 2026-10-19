import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compile } from "svelte/compiler";
import { render } from "svelte/server";

const COMPONENTS = ["input", "textarea", "select", "checkbox", "radio", "label", "field"] as const;

function source(name: string): string {
  return readFileSync(join(import.meta.dir, `../src/${name}.svelte`), "utf8");
}

/** Compile the SSR output to a temp module and render it like Astro/SSR would. */
async function renderComponent(name: string, props: Record<string, unknown> = {}): Promise<string> {
  const result = compile(source(name), { filename: `${name}.svelte`, generate: "server" });
  const dir = mkdtempSync(join(import.meta.dir, ".tmp-"));
  try {
    const file = join(dir, `${name}.mjs`);
    writeFileSync(file, result.js.code);
    const module = (await import(file)) as { default: unknown };
    return render(module.default as Parameters<typeof render>[0], { props } as never).body;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("form components (Svelte)", () => {
  it("all compile as valid Svelte 5", () => {
    for (const name of COMPONENTS) {
      const result = compile(source(name), { filename: `${name}.svelte`, generate: "server" });
      expect(result.js.code.length).toBeGreaterThan(0);
    }
  });

  it("Input renders field styling and forwards attributes", async () => {
    const html = await renderComponent("input", { name: "email", placeholder: "you@example.com" });
    expect(html).toContain("<input");
    expect(html).toContain('name="email"');
    expect(html).toContain('placeholder="you@example.com"');
    expect(html).toContain("h-10");
    expect(html).not.toContain("aria-invalid");
  });

  it("Input switches border and sets aria-invalid", async () => {
    const html = await renderComponent("input", { invalid: true });
    expect(html).toContain("border-red-500");
    expect(html).toContain('aria-invalid="true"');
  });

  it("Textarea defaults to four rows", async () => {
    const html = await renderComponent("textarea");
    expect(html).toContain("<textarea");
    expect(html).toContain('rows="4"');
  });

  it("Textarea honors rows and invalid", async () => {
    const html = await renderComponent("textarea", { rows: 6, invalid: true });
    expect(html).toContain('rows="6"');
    expect(html).toContain("border-red-500");
  });

  it("Select renders the control, styles it, and reserves space for the chevron", async () => {
    const html = await renderComponent("select", { name: "role" });
    expect(html).toContain("<select");
    expect(html).toContain('name="role"');
    expect(html).toContain("appearance-none");
    expect(html).toContain("pr-9");
    expect(html).toContain("<svg");
  });

  it("Checkbox and Radio keep their native types", async () => {
    expect(await renderComponent("checkbox", { name: "terms" })).toContain('type="checkbox"');
    expect(await renderComponent("radio", { name: "plan" })).toContain('type="radio"');
  });

  it("Label renders a label element with slot content", () => {
    const src = source("label");
    expect(src).toContain("<label");
    expect(src).toContain("@render children");
  });

  it("Field forwards wiring through the control snippet", () => {
    const src = source("field");
    expect(src).toContain("control?.(");
    expect(src).toContain("controlProps");
    expect(src).toContain("aria-describedby");
    expect(src).toContain("<label");
  });

  it("keeps the runes/snippet API rather than legacy slots", () => {
    for (const name of COMPONENTS) {
      const src = source(name);
      expect(src).toContain("$props()");
      expect(src).not.toContain("<slot");
    }
  });
});
