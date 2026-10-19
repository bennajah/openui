import { describe, expect, it, spyOn } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { cliVersion, main } from "../src/run.ts";
import { createProject, createRegistry, makeTempDir } from "./helpers.ts";

function capture(): { lines: string[]; restore: () => void } {
  const lines: string[] = [];
  const log = spyOn(console, "log").mockImplementation((...args: unknown[]) => {
    lines.push(args.join(" "));
  });
  return { lines, restore: () => log.mockRestore() };
}

describe("CLI dispatch", () => {
  it("reports its version from package.json", () => {
    expect(cliVersion()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("prints help for --help and for `help <command>`", async () => {
    const { lines, restore } = capture();
    try {
      expect(await main(["--help"])).toBe(0);
      expect(lines.join("\n")).toContain("openui <command>");
      lines.length = 0;
      expect(await main(["help", "add"])).toBe(0);
      expect(lines.join("\n")).toContain("openui add");
    } finally {
      restore();
    }
  });

  it("rejects unknown commands and unknown flags", async () => {
    const { restore } = capture();
    const error = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await main(["frobnicate"])).toBe(1);
      expect(await main(["init", "--frobnicate"])).toBe(1);
    } finally {
      error.mockRestore();
      restore();
    }
  });

  it("runs init end-to-end through the dispatcher", async () => {
    const root = makeTempDir();
    const { restore } = capture();
    try {
      expect(await main(["init", "--cwd", root, "--framework", "svelte"])).toBe(0);
      const config = JSON.parse(readFileSync(join(root, "openui.json"), "utf8"));
      expect(config.framework).toBe("svelte");
    } finally {
      restore();
    }
  });

  it("runs add end-to-end through the dispatcher", async () => {
    const root = createProject();
    createRegistry(root);
    const { restore } = capture();
    try {
      expect(await main(["add", "button", "--cwd", root])).toBe(0);
      expect(existsSync(join(root, "src/components/ui/button.tsx"))).toBe(true);
    } finally {
      restore();
    }
  });

  it("returns 1 when add is called without components", async () => {
    const { restore } = capture();
    const error = spyOn(console, "error").mockImplementation(() => {});
    try {
      expect(await main(["add"])).toBe(1);
    } finally {
      error.mockRestore();
      restore();
    }
  });
});
