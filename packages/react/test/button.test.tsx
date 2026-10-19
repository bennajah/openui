import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Button } from "../src/button.tsx";

describe("Button (React)", () => {
  it("renders a button with the primary variant by default", () => {
    const html = renderToStaticMarkup(<Button>Save</Button>);
    expect(html).toContain('<button type="button"');
    expect(html).toContain("bg-zinc-900");
    expect(html).toContain("h-10");
    expect(html).toContain(">Save</button>");
  });

  it("applies variant, size, and full-width classes", () => {
    const html = renderToStaticMarkup(
      <Button variant="danger" size="lg" fullWidth>
        Delete
      </Button>,
    );
    expect(html).toContain("bg-red-600");
    expect(html).toContain("h-12");
    expect(html).toContain("w-full");
  });

  it("merges user classes and forwards native props", () => {
    const html = renderToStaticMarkup(
      <Button className="custom" disabled aria-label="Save changes" type="submit">
        Save
      </Button>,
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain('aria-label="Save changes"');
    expect(html).toContain("disabled");
    expect(html).toContain("custom");
  });

  it("keeps variant classes mutually exclusive", () => {
    const primary = renderToStaticMarkup(<Button>One</Button>);
    const outline = renderToStaticMarkup(<Button variant="outline">Two</Button>);
    expect(primary).not.toContain("border-zinc-300");
    expect(outline).toContain("border-zinc-300");
    expect(outline).not.toContain("bg-zinc-900 text-white");
  });
});
