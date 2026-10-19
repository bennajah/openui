import { describe, expect, test } from "bun:test";
import {
  expandTarget,
  resolveAliasToPath,
  resolveAliases,
  validateRegistryIndex,
  validateRegistryItem,
} from "../src/index.ts";

const goodIndex = {
  name: "openui",
  version: "1.0.0",
  components: {
    button: {
      title: "Button",
      description: "Triggers an action.",
      frameworks: {
        react: { item: "r/button-react.json" },
        svelte: { item: "r/button-svelte.json" },
      },
      meta: {
        variant: [{ name: "default", description: "Primary action." }],
        props: [{ name: "variant", type: '"default" | "outline"', default: '"default"', description: "Visual style." }],
      },
    },
  },
};

describe("validateRegistryIndex", () => {
  test("accepts a well-formed index", () => {
    const result = validateRegistryIndex(goodIndex);
    expect(result.ok).toBe(true);
  });

  test("rejects missing name/version/components", () => {
    const result = validateRegistryIndex({ components: {} });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const text = result.errors.join("\n");
    expect(text).toContain('"name"');
    expect(text).toContain('"version"');
    expect(text).toContain('"components"');
  });

  test("rejects unknown frameworks and malformed item paths", () => {
    const result = validateRegistryIndex({
      name: "x",
      version: "1.0.0",
      components: {
        button: {
          title: "Button",
          description: "d",
          frameworks: {
            solid: { item: "r/button-solid.json" },
            react: { item: "button-react.json" },
          },
        },
      },
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join()).toContain('unknown framework "solid"');
    expect(result.errors.join()).toContain('must look like "r/<name>.json"');
  });

  test("rejects non-kebab-case component names", () => {
    const result = validateRegistryIndex({
      name: "x",
      version: "1.0.0",
      components: {
        Button: { title: "B", description: "d", frameworks: { react: { item: "r/button-react.json" } } },
      },
    });
    expect(result.ok).toBe(false);
  });
});

const goodItem = {
  name: "button",
  framework: "react",
  version: "0.1.0-beta.0",
  description: "Button component.",
  dependencies: [],
  files: [
    {
      path: "packages/react/src/button.tsx",
      content: "export const Button = () => null;",
      target: "{ui}/button.tsx",
      type: "component",
    },
  ],
};

describe("validateRegistryItem", () => {
  test("accepts a well-formed item", () => {
    expect(validateRegistryItem(goodItem).ok).toBe(true);
  });

  test("rejects items that depend on OpenUI runtime packages", () => {
    const result = validateRegistryItem({ ...goodItem, dependencies: ["@openui/react"] });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join()).toContain("must not depend on OpenUI runtime packages");
  });

  test("rejects empty file content (items must be self-contained)", () => {
    const result = validateRegistryItem({
      ...goodItem,
      files: [{ ...goodItem.files[0]!, content: "  " }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join()).toContain('"content"');
  });

  test("rejects unknown target tokens", () => {
    const result = validateRegistryItem({
      ...goodItem,
      files: [{ ...goodItem.files[0]!, target: "{src}/button.tsx" }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join()).toContain('unknown target token "{src}"');
  });

  test("rejects an invalid framework", () => {
    const result = validateRegistryItem({ ...goodItem, framework: "reactt" });
    expect(result.ok).toBe(false);
  });
});

describe("alias + target resolution", () => {
  test("resolves aliases from tsconfig paths when available", () => {
    const paths = { "@/components/*": ["./src/components/*"], "~/*": ["./app/*"] };
    expect(resolveAliasToPath("@/components/ui", paths)).toEqual({
      path: "src/components/ui",
      via: "tsconfig",
    });
  });

  test("falls back to the @/ → src/ convention", () => {
    expect(resolveAliasToPath("@/components/ui")).toEqual({ path: "src/components/ui", via: "convention" });
    expect(resolveAliasToPath("~/lib/utils")).toEqual({ path: "src/lib/utils", via: "convention" });
  });

  test("resolveAliases handles both aliases", () => {
    const resolved = resolveAliases({ components: "@/components", ui: "@/components/ui" });
    expect(resolved.ui.path).toBe("src/components/ui");
    expect(resolved.components.path).toBe("src/components");
  });

  test("expandTarget substitutes all known tokens", () => {
    expect(expandTarget("{ui}/button.tsx", { ui: "src/components/ui", components: "src/components", css: "src/styles" })).toBe(
      "src/components/ui/button.tsx",
    );
    expect(expandTarget("{css}/openui.css", { ui: "u", components: "c", css: "src/styles" })).toBe("src/styles/openui.css");
  });
});
