/**
 * Programmatic entrypoint for the OpenUI CLI.
 *
 * The executable shim (`bin/openui.js`) calls `main` with `process.argv`.
 * Exporting instead of auto-running keeps this module safe to import in tests
 * and integrations.
 */
export { cliVersion, main } from "./run.ts";
