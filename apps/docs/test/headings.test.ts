import { describe, expect, it } from "bun:test";
import { extractHeadings, slugifyHeading } from "../src/lib/headings.ts";

describe("docs headings", () => {
  it("extracts level-2 and level-3 headings in order", () => {
    const markdown = "# Title\n\n## Usage\n\n### Example\n\n## Props\n";
    expect(extractHeadings(markdown)).toEqual([
      { depth: 2, text: "Usage", slug: "usage" },
      { depth: 3, text: "Example", slug: "example" },
      { depth: 2, text: "Props", slug: "props" },
    ]);
  });

  it("ignores the level-1 title", () => {
    expect(extractHeadings("# Button\n\n## Usage\n")).toEqual([
      { depth: 2, text: "Usage", slug: "usage" },
    ]);
  });

  it("never treats a comment inside a fenced code block as a heading", () => {
    const markdown = "## Usage\n\n```tsx\n// # not a heading\nconst x = 1;\n```\n\n## Props\n";
    expect(extractHeadings(markdown).map((heading) => heading.text)).toEqual(["Usage", "Props"]);
  });

  it("strips inline Markdown from heading text", () => {
    const markdown = "## The `invalid` prop\n\n### See [Field](/docs/components/field)\n";
    expect(extractHeadings(markdown).map((heading) => heading.text)).toEqual([
      "The invalid prop",
      "See Field",
    ]);
  });

  it("slugifies like the Markdown renderer", () => {
    expect(slugifyHeading("Sharing a name (and more!)")).toBe("sharing-a-name-and-more");
    expect(slugifyHeading("Radio group")).toBe("radio-group");
  });
});
