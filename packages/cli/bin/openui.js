#!/usr/bin/env bun
// OpenUI CLI entrypoint.
//
// The beta ships TypeScript sources directly and runs them with Bun. A
// compiled Node-compatible `dist` build is planned before the first stable
// npm release (see README "Current limitations").
// The bare import loads the CLI, which runs on import — intentional.
// oxlint-disable-next-line import/no-unassigned-import
import "../src/index.ts";
