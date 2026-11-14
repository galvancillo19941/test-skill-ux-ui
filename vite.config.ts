import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite-plus";
import rawConfig from "./content/config.json";

/**
 * `vp dev` only: fills index.html's prerender markers (scripts/prerender.ts does
 * it for real builds) so the dev page has its lang and title and renders
 * client-side. No CSP in dev: Vite's HMR client needs more than the site does.
 */
function devHead(): Plugin {
  return {
    name: "dev-head",
    apply: "serve",
    transformIndexHtml: (html) =>
      html
        .replace("<!--app-lang-->", rawConfig.lang)
        .replace("<!--app-head-->", `<title>${rawConfig.name} (dev)</title>`)
        .replace("<!--app-html-->", ""),
  };
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), devHead()],
  build: {
    // Never publish source maps (they'd expose the source on the public site).
    sourcemap: false,
    // Every asset is a real file (favicon included), never an inline data: URI.
    assetsInlineLimit: 0,
  },
  server: { open: false },
  staged: {
    "*": "vp check --fix",
  },
  lint: {
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
  fmt: {},
});
