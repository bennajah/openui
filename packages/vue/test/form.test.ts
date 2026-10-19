import { describe, expect, it } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createSSRApp, h } from "vue";
import { parse, compileScript } from "vue/compiler-sfc";
import { renderToString } from "vue/server-renderer";

const COMPONENTS = ["input", "textarea", "select", "checkbox", "radio", "label", "field"] as const;

function source(name: string): string {
  return readFileSync(join(import.meta.dir, `../src/${name}.vue`), "utf8");
}

/** Compile an SFC to a temp module and render it through Vue's SSR renderer. */
async function renderComponent(
  name: string,
  props: Record<string, unknown> = {},
  slots: Record<string, (slotProps: Record<string, string | undefined>) => unknown> = {},
): Promise<string> {
  const { descriptor, errors } = parse(source(name), { filename: `${name}.vue` });
  if (errors.length > 0) throw new Error(String(errors[0]));
  const compiled = compileScript(descriptor, { id: `openui-${name}`, inlineTemplate: true });

  const dir = mkdtempSync(join(import.meta.dir, ".tmp-"));
  try {
    const file = join(dir, `${name}.mjs`);
    writeFileSync(file, compiled.content);
    const module = (await import(file)) as { default: Parameters<typeof createSSRApp>[0] };
    return await renderToString(createSSRApp({ render: () => h(module.default, props, slots) }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe("form components (Vue)", () => {
  it("all compile without SFC errors", async () => {
    for (const name of COMPONENTS) {
      const { descriptor, errors } = parse(source(name), { filename: `${name}.vue` });
      expect(errors).toEqual([]);
      const compiled = compileScript(descriptor, { id: `openui-${name}`, inlineTemplate: true });
      expect(compiled.content.length).toBeGreaterThan(0);
    }
  });

  it("Input renders field styling and forwards attributes", async () => {
    const html = await renderComponent("input", { name: "email", placeholder: "you@example.com" });
    expect(html).toContain("<input");
    expect(html).toContain('name="email"');
    expect(html).toContain('placeholder="you@example.com"');
    expect(html).toContain("h-10");
  });

  it("Input marks the invalid state", async () => {
    const html = await renderComponent("input", { invalid: true });
    expect(html).toContain("border-red-500");
    expect(html).toContain('aria-invalid="true"');
  });

  it("Textarea renders rows and invalid styles", async () => {
    const html = await renderComponent("textarea", { rows: 5, invalid: true });
    expect(html).toContain("<textarea");
    expect(html).toContain('rows="5"');
    expect(html).toContain("border-red-500");
  });

  it("Select renders the control with a chevron and slotted options", async () => {
    const html = await renderComponent("select", { name: "role" }, { default: () => "options" });
    expect(html).toContain("<select");
    expect(html).toContain("appearance-none");
    expect(html).toContain("<svg");
    expect(html).toContain("options");
  });

  it("Checkbox and Radio keep their native types", async () => {
    expect(await renderComponent("checkbox", { name: "terms" })).toContain('type="checkbox"');
    expect(await renderComponent("radio", { name: "plan" })).toContain('type="radio"');
  });

  it("Label renders a label with slot content", async () => {
    const html = await renderComponent("label", {}, { default: () => "Email" });
    expect(html).toContain("<label");
    expect(html).toContain("Email");
  });

  it("Field links the label to a generated control id and exposes wiring", async () => {
    let controlProps: Record<string, string | undefined> = {};
    const html = await renderComponent(
      "field",
      { label: "Email", hint: "We never share it." },
      {
        default: (props) => {
          controlProps = (props.controlProps ?? {}) as Record<string, string | undefined>;
          return h("input", { id: controlProps.id, ariadescribedby: controlProps.ariaDescribedby });
        },
      },
    );
    expect(html).toContain("<label");
    expect(html).toContain("Email");
    expect(html).toContain("We never share it.");
    expect(controlProps.id).toBeTruthy();
    expect(html).toContain(`for="${controlProps.id}"`);
    expect(html).toContain(`id="${controlProps.id}"`);
    expect(controlProps.ariaDescribedby).toBeTruthy();
    expect(html).toContain(`ariadescribedby="${controlProps.ariaDescribedby}"`);
  });

  it("Field reports the error state to the control slot", async () => {
    let controlProps: Record<string, string | boolean | undefined> = {};
    const html = await renderComponent(
      "field",
      { label: "Email", error: "Required" },
      {
        default: (props) => {
          controlProps = (props.controlProps ?? {}) as Record<string, string | boolean | undefined>;
          return h("input", { "aria-invalid": controlProps.ariaInvalid });
        },
      },
    );
    expect(html).toContain("Required");
    expect(html).toContain("text-red-600");
    expect(controlProps.ariaInvalid).toBe(true);
  });

  it("stays plain JavaScript so JavaScript projects can install it", () => {
    for (const name of COMPONENTS) {
      expect(source(name)).not.toContain('<script lang="ts"');
    }
  });
});
