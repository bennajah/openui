import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { OpenUIConfig, RegistryIndex, RegistryItem, RegistryItemFile } from "@openui/core";

/** Create an isolated project directory (outside the repository). */
export function makeTempDir(prefix = "openui-cli-"): string {
  return mkdtempSync(join(tmpdir(), prefix));
}

export function writeJson(path: string, value: unknown): void {
  mkdirSync(join(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function baseConfig(overrides: Partial<OpenUIConfig> = {}): OpenUIConfig {
  return {
    framework: "react",
    typescript: true,
    tailwind: { css: "src/styles/global.css", prefix: "" },
    aliases: { components: "@/components", ui: "@/components/ui" },
    registry: { url: "./registry" },
    ...overrides,
  };
}

export function createProject(overrides: Partial<OpenUIConfig> = {}): string {
  const root = makeTempDir();
  writeJson(join(root, "openui.json"), baseConfig(overrides));
  return root;
}

function file(target: string, content: string): RegistryItemFile {
  return {
    path: `packages/fixture/src/${target.split("/").pop()}`,
    content,
    target,
    type: "component",
  };
}

export const COMPONENTS = [
  {
    name: "button",
    title: "Button",
    description: "A framework-native button.",
    content: {
      react: "export function Button() { return <button>Click</button>; }\n",
      svelte: "<button>Click</button>\n",
      astro: "---\n---\n<button>Click</button>\n",
      vue: "<template><button>Click</button></template>\n",
    },
  },
] as const;

/** Build a local registry containing one button per framework. */
export function createRegistry(root: string, dir = "registry"): string {
  const registryDir = join(root, dir);
  const components: RegistryIndex["components"] = {};

  for (const component of COMPONENTS) {
    const frameworks: RegistryIndex["components"][string]["frameworks"] = {};

    for (const framework of ["react", "svelte", "astro", "vue"] as const) {
      const ext =
        framework === "react"
          ? "tsx"
          : framework === "svelte"
            ? "svelte"
            : framework === "astro"
              ? "astro"
              : "vue";
      const files: RegistryItemFile[] = [file(`{ui}/button.${ext}`, component.content[framework])];

      // React ships a JSX sibling so JS projects install the right variant.
      if (framework === "react") {
        files.push(
          file("{ui}/button.jsx", "export function Button() { return <button>Click</button>; }\n"),
        );
        files[0] = file(
          "{ui}/button.tsx",
          "export function Button(): JSX.Element { return <button>Click</button>; }\n",
        );
      }

      const item: RegistryItem = {
        name: component.name,
        framework,
        version: "0.1.0",
        description: component.description,
        dependencies: [],
        registryDependencies: [],
        files,
      };
      const itemPath = `r/${component.name}-${framework}.json`;
      writeJson(join(registryDir, itemPath), item);
      frameworks[framework] = { item: itemPath };
    }

    components[component.name] = {
      title: component.title,
      description: component.description,
      frameworks,
    };
  }

  const index: RegistryIndex = {
    name: "fixture",
    version: "0.1.0",
    components,
  };
  writeJson(join(registryDir, "index.json"), index);
  return registryDir;
}
