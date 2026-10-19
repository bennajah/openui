import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compile } from "svelte/compiler";
import { render } from "svelte/server";

const SOURCE = readFileSync(join(import.meta.dir, "../src/button.svelte"), "utf8");

/** Compile the SSR output to a temp module and render it like Astro/SSR would. */
async function renderButton(props: Record<string, unknown> = {}): Promise<string> {
  const result = compile(SOURCE, { filename: "button.svelte", generate: "server" });
  const dir = mkdtempSync(join(import.meta.dir, ".tmp-"));
  try {
    const file = join(dir, "button.mjs");
    writeFileSync(file, result.js.code);
    const module = (await import(file)) as { default: Parameters<typeof render>[0] };
    return render(module.default, { props }).body;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("Button (Svelte)", () => {
  it("compiles as valid Svelte 5", () => {
    const result = compile(SOURCE, { filename: "button.svelte", generate: "server" });
    expect(result.js.code.length).toBeGreaterThan(0);
  });

  it("renders a button with primary classes by default", async () => {
    const html = await renderButton();
    expect(html).toContain("<button");
    expect(html).toContain('type="button"');
    expect(html).toContain("bg-zinc-900");
    expect(html).toContain("h-10");
  });

  it("applies variant, size, and forwarded attributes", async () => {
    const html = await renderButton({
      variant: "danger",
      size: "lg",
      fullWidth: true,
      disabled: true,
      "aria-label": "Delete",
    });
    expect(html).toContain("bg-red-600");
    expect(html).toContain("h-12");
    expect(html).toContain("w-full");
    expect(html).toContain("disabled");
    expect(html).toContain('aria-label="Delete"');
  });

  it("uses snippets rather than the legacy slot API", () => {
    expect(SOURCE).toContain("$props()");
    expect(SOURCE).toContain("@render children");
    expect(SOURCE).not.toContain("<slot");
  });
});
