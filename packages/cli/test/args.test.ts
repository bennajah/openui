import { describe, expect, it } from "bun:test";
import { flagBool, flagString, parseArgs } from "../src/args.ts";

describe("parseArgs", () => {
  it("splits the command from positionals", () => {
    const args = parseArgs(["add", "button", "input"]);
    expect(args.command).toBe("add");
    expect(args.positionals).toEqual(["button", "input"]);
    expect(args.flags).toEqual({});
  });

  it("parses boolean and negated flags", () => {
    const args = parseArgs(["init", "--force", "--no-typescript"]);
    expect(args.flags).toEqual({ force: true, typescript: false });
    expect(flagBool(args.flags, "force")).toBe(true);
    expect(flagBool(args.flags, "typescript")).toBe(false);
  });

  it("parses space-separated value flags", () => {
    const args = parseArgs(["init", "--framework", "svelte", "--cwd", "/tmp/app"]);
    expect(args.flags.framework).toBe("svelte");
    expect(args.flags.cwd).toBe("/tmp/app");
    expect(flagString(args.flags, "framework")).toBe("svelte");
  });

  it("parses --key=value", () => {
    const args = parseArgs(["add", "button", "--registry=https://example.com/r"]);
    expect(args.flags.registry).toBe("https://example.com/r");
    expect(args.positionals).toEqual(["button"]);
  });

  it("does not swallow a following flag as a value", () => {
    const args = parseArgs(["init", "--framework", "--force"]);
    expect(args.flags.framework).toBe(true);
    expect(args.flags.force).toBe(true);
  });

  it("treats the first token as the command even when flags precede it", () => {
    const args = parseArgs(["--cwd", "/tmp/app", "list"]);
    expect(args.command).toBe("list");
    expect(args.flags.cwd).toBe("/tmp/app");
  });
});
