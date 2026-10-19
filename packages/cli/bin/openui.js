#!/usr/bin/env bun
// OpenUI CLI entrypoint.
//
// The beta ships TypeScript sources directly and runs them with Bun. A
// compiled Node-compatible `dist` build is planned before the first stable
// npm release (see README "Current limitations").
import process from "node:process";
import { main } from "../src/run.ts";

process.exitCode = await main(process.argv.slice(2));
