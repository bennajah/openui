import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://openui.dev",
  vite: {
    plugins: [tailwindcss()],
  },
});
