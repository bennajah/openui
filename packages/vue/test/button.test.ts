import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse, compileScript } from "vue/compiler-sfc";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";

const SOURCE = readFileSync(join(import.meta.dir, "../src/button.vue"), "utf8");

/** Compile the SFC to a temp module and render it through Vue's SSR renderer. */
async function renderButton(props: Record<string, unknown> = {}): Promise<string> {
  const { descriptor, errors } = parse(SOURCE, { filename: "button.vue" });
  if (errors.length > 0) throw new Error(String(errors[0]));
  const compiled = compileScript(descriptor, { id: "openui-button", inlineTemplate: true });

  const dir = mkdtempSync(join(import.meta.dir, ".tmp-"));
  try {
    const file = join(dir, "button.mjs");
    writeFileSync(file, compiled.content);
    const module = (await import(file)) as { default: Parameters<typeof createSSRApp>[0] };
    return await renderToString(createSSRApp(module.default, props));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("Button (Vue)", () => {
  it("compiles without SFC errors", async () => {
    const html = await renderButton();
    expect(html).toContain("<button");
  });

  it("renders primary classes by default", async () => {
    const html = await renderButton();
    expect(html).toContain('type="button"');
    expect(html).toContain("bg-zinc-900");
    expect(html).toContain("h-10");
  });

  it("applies variant and size props", async () => {
    const html = await renderButton({ variant: "outline", size: "sm", fullWidth: true });
    expect(html).toContain("border-zinc-300");
    expect(html).toContain("h-8");
    expect(html).toContain("w-full");
  });

  it("stays plain JavaScript for JavaScript projects", () => {
    expect(SOURCE).not.toContain('<script lang="ts"');
    expect(SOURCE).toContain("defineProps({");
  });
});
