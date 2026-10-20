import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(999),
    /** Sidebar group: "reference", "components", or "frameworks". */
    group: z.enum(["reference", "components", "frameworks"]).default("reference"),
    /** Registry component name; enables the preview + framework source panel. */
    component: z.string().optional(),
    /** Named live preview to render above the prose. */
    demo: z.string().optional(),
  }),
});

export const collections = { docs };
