import { describe, expect, it } from "bun:test";
import { resolve } from "node:path";
import {
  buildLlms,
  checkLinks,
  parseFrontmatter,
  REQUIRED_SLUGS,
  rewriteLinks,
  validateLlms,
} from "../../../scripts/lib/docs.ts";

const REPO_ROOT = resolve(import.meta.dir, "../../..");

describe("LLM documentation", () => {
  it("is complete, current, and link-safe", () => {
    const report = validateLlms(REPO_ROOT);
    expect(report.errors).toEqual([]);
    expect(report.ok).toBe(true);
  });

  it("generates every required page", () => {
    const paths = new Set(buildLlms(REPO_ROOT).map((output) => output.path));
    for (const slug of REQUIRED_SLUGS) {
      expect(paths.has(`llms/${slug}.md`)).toBe(true);
    }
    expect(paths.has("llms.txt")).toBe(true);
    expect(paths.has("llms-full.txt")).toBe(true);
  });

  it("rewrites site links to absolute URLs", () => {
    expect(rewriteLinks("[config](/docs/configuration)")).toBe(
      "[config](https://openuii.vercel.app/docs/configuration)",
    );
  });

  it("parses YAML frontmatter", () => {
    const parsed = parseFrontmatter('---\ntitle: "Hello: world"\ndescription: Test\n---\n\nBody\n');
    expect(parsed.data.title).toBe("Hello: world");
    expect(parsed.data.description).toBe("Test");
    expect(parsed.body).toBe("Body\n");
  });

  it("detects broken local links", () => {
    const publicRoot = resolve(REPO_ROOT, "apps/docs/public");
    const errors = checkLinks(
      "llms/test.md",
      "[ok](https://openuii.vercel.app/docs/cli) [bad](https://openuii.vercel.app/docs/nope) [rel](./missing.md)",
      new Set(["cli"]),
      publicRoot,
    );
    expect(errors.some((e) => e.includes("unknown docs page"))).toBe(true);
    expect(errors.some((e) => e.includes("broken relative link"))).toBe(true);
  });

  it("flags missing canonical pages", () => {
    expect(REQUIRED_SLUGS).toContain("getting-started");
    expect(REQUIRED_SLUGS).toContain("components/index");
    expect(REQUIRED_SLUGS).toContain("components/button");
    expect(REQUIRED_SLUGS).toContain("frameworks/react");
  });
});
