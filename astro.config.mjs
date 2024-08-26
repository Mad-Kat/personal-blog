import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import { testPlugin } from "./src/utils/test-plugin.mjs";
import sitemap from "@astrojs/sitemap";
import wasm from "vite-plugin-wasm";

import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  site: "https://example.com",
  integrations: [mdx(), sitemap(), react()],
  markdown: {
    remarkPlugins: [testPlugin],
    shikiConfig: {
      themes: {
        light: "vitesse-light",
        dark: "vitesse-dark"
      }
    }
  },
  vite: {
    plugins: [wasm()]
  }
});