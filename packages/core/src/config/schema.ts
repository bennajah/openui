import type { OpenUIConfig } from "./types.ts";

/**
 * JSON Schema for `openui.json` (draft 2020-12).
 *
 * This object is the canonical source: `bun run schema:generate` writes it to
 * `apps/docs/public/schema.json` so it is served at https://openui.dev/schema.json.
 *
 * `additionalProperties` is deliberately `true`: tools may extend the config,
 * and the CLI preserves unknown fields when it rewrites the file.
 */
export const configSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://openui.dev/schema.json",
  title: "OpenUI configuration",
  description:
    "Configuration for the OpenUI CLI and component registry (openui.json). Paths are resolved relative to the consuming project's root.",
  type: "object",
  properties: {
    $schema: {
      type: "string",
      description: "URL of this schema for editor validation and completion.",
    },
    framework: {
      enum: ["react", "svelte", "astro", "vue", "auto"],
      default: "auto",
      description:
        "Target framework. `auto` (default) detects the framework from the project's dependencies and config files. Explicit values skip detection.",
    },
    typescript: {
      type: "boolean",
      default: true,
      description:
        "Install TypeScript component variants when available (for example `button.tsx` instead of `button.jsx`).",
    },
    tailwind: {
      type: "object",
      description: "Tailwind CSS integration settings.",
      properties: {
        css: {
          type: "string",
          default: "src/styles/global.css",
          description:
            "Path, relative to the project root, to the global Tailwind CSS entry file. OpenUI theme tokens are written relative to this file.",
        },
        prefix: {
          type: "string",
          default: "",
          description: "Tailwind class prefix configured in the consuming project, if any.",
        },
      },
      additionalProperties: true,
    },
    aliases: {
      type: "object",
      description: "Import aliases used by generated import statements and install destinations.",
      properties: {
        components: {
          type: "string",
          default: "@/components",
          description: "Import alias for the components directory.",
        },
        ui: {
          type: "string",
          default: "@/components/ui",
          description: "Import alias for UI primitives. Installed components target this directory.",
        },
      },
      additionalProperties: true,
    },
    registry: {
      type: "object",
      description: "Component registry resolution.",
      properties: {
        url: {
          type: "string",
          default: "https://openui.dev/registry",
          description:
            "Registry root: an http(s) URL serving `index.json` and `r/*.json`, or a filesystem path (absolute, or relative to the project root).",
        },
      },
      additionalProperties: true,
    },
  },
  additionalProperties: true,
} as const;

/** Example configuration used by `openui init`, the docs, and tests. */
export const EXAMPLE_CONFIG: OpenUIConfig = {
  $schema: "https://openui.dev/schema.json",
  framework: "auto",
  typescript: true,
  tailwind: {
    css: "src/styles/global.css",
    prefix: "",
  },
  aliases: {
    components: "@/components",
    ui: "@/components/ui",
  },
  registry: {
    url: "https://openui.dev/registry",
  },
};
