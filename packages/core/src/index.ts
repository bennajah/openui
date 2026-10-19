/**
 * @openui/core — configuration, framework detection, and registry contracts.
 *
 * Zero runtime dependencies. This package is tooling-only: it is never a
 * dependency of installed components.
 */

export {
  DEFAULT_CONFIG,
  CONFIG_FILENAME,
  FRAMEWORK_NAMES,
  TARGET_TOKENS,
  type AliasesConfig,
  type FrameworkChoice,
  type FrameworkName,
  type OpenUIConfig,
  type RegistryConfig,
  type TailwindConfig,
  type TargetToken,
} from "./config/types.ts";

export { configSchema, EXAMPLE_CONFIG } from "./config/schema.ts";

export {
  validateConfig,
  mergeConfig,
  levenshtein,
  type ValidationResult,
} from "./config/validate.ts";

export {
  applyOverrides,
  findConfigPath,
  loadConfig,
  type LoadConfigOptions,
  type LoadConfigResult,
  type LoadedConfig,
} from "./config/load.ts";

export {
  expandTarget,
  resolveAliases,
  resolveAliasToPath,
  type AliasResolution,
  type ResolvedAliases,
  type TargetTokenValues,
} from "./config/aliases.ts";

export {
  detectFramework,
  readPackageJson,
  type DetectionConfidence,
  type DetectionResult,
} from "./framework/detect.ts";

export {
  EXTENSION_BY_LANGUAGE,
  type ComponentMeta,
  type ComponentMetaEntry,
  type RegistryComponentEntry,
  type RegistryIndex,
  type RegistryItem,
  type RegistryItemFile,
  type RegistryFileType,
} from "./registry/types.ts";

export {
  validateRegistryIndex,
  validateRegistryItem,
  type RegistryValidation,
} from "./registry/validate.ts";
