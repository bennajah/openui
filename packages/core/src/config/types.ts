/**
 * OpenUI configuration types and defaults.
 *
 * The configuration is plain JSON (`openui.json`) and deliberately lives
 * outside any framework/runtime package: it is consumed only by tooling
 * (the `openui` CLI, registry builders, docs generators).
 */

/** Frameworks OpenUI ships native components for. `auto` = detect from the project. */
export type FrameworkChoice = "react" | "svelte" | "astro" | "vue" | "auto";

/** Concrete (detectable) frameworks — the subset without `auto`. */
export type FrameworkName = Exclude<FrameworkChoice, "auto">;

export const FRAMEWORK_NAMES: readonly FrameworkName[] = ["react", "svelte", "astro", "vue"];

export interface TailwindConfig {
  /** Path (relative to the project root) to the global Tailwind CSS entry file. */
  css: string;
  /** Optional Tailwind class prefix, e.g. `"tw-"`. Empty string means no prefix. */
  prefix: string;
}

export interface AliasesConfig {
  /** Import alias for the components directory, e.g. `"@/components"`. */
  components: string;
  /** Import alias for the UI primitives directory, e.g. `"@/components/ui"`. */
  ui: string;
}

export interface RegistryConfig {
  /**
   * Registry location. Either an `http(s)://` URL serving `index.json` and
   * `r/*.json`, or a filesystem path (absolute, or relative to the project
   * root) to a registry directory.
   */
  url: string;
}

export interface OpenUIConfig {
  /** Optional JSON Schema reference, conventionally `https://openui.dev/schema.json`. */
  $schema?: string;
  /** Framework selection. `"auto"` detects from the project's dependencies. */
  framework: FrameworkChoice;
  /** Whether components are installed as TypeScript (`.tsx`/typed) or JavaScript variants. */
  typescript: boolean;
  tailwind: TailwindConfig;
  aliases: AliasesConfig;
  registry: RegistryConfig;
}

/** Defaults applied to every `openui.json`. Documented in docs/configuration. */
export const DEFAULT_CONFIG: OpenUIConfig = {
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

/** The conventional config filename for the OpenUI beta. */
export const CONFIG_FILENAME = "openui.json";

/** Path-template tokens a registry item may use in `files[].target`. */
export const TARGET_TOKENS = ["{ui}", "{components}", "{css}"] as const;
export type TargetToken = (typeof TARGET_TOKENS)[number];
