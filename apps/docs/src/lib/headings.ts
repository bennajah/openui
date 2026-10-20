/**
 * Heading extraction for the on-this-page table of contents.
 *
 * Reads ATX headings (`##`, `###`) from canonical Markdown, skipping fenced code
 * blocks so a `# comment` inside an example is never mistaken for a heading.
 * Mirrors the slug algorithm Astro's default Markdown renderer uses
 * (lowercase, non-alphanumerics → `-`, trimmed).
 */
export interface Heading {
  depth: number;
  text: string;
  slug: string;
}

export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/** Strip inline Markdown (code spans, links, emphasis) from heading text. */
function stripInline(text: string): string {
  return text
    .replace(/`([^`]*)`/g, "$1")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\*\*([^*]*)\*\*/g, "$1")
    .replace(/\*([^*]*)\*/g, "$1")
    .trim();
}

export function extractHeadings(markdown: string): Heading[] {
  const headings: Heading[] = [];
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (line.trimStart().startsWith("```")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = /^(#{2,3})\s+(.*)$/.exec(line);
    if (match === null) continue;
    const text = stripInline(match[2] ?? "");
    if (text === "") continue;
    headings.push({ depth: match[1]!.length, text, slug: slugifyHeading(text) });
  }
  return headings;
}
