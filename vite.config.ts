import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite-plus";
import rawConfig from "./content/config.json";
import { documentAt, documentPageFile } from "./src/site/documents.ts";
import { siteConfigSchema } from "./src/site/schema.ts";

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

/**
 * `vp dev` and `vp preview`: each document's page at its path (documents.ts),
 * with or without the trailing slash, before the SPA fallback answers with the
 * home page. Dev serves document.html there (src/document.ts draws the page
 * from the path); preview serves the prerendered `<path>/index.html`.
 */
function documentPages(): Plugin {
  const config = siteConfigSchema.parse(rawConfig);
  return {
    name: "document-pages",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (documentAt(config.documents, req.url)) req.url = "/document.html";
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        const doc = documentAt(config.documents, req.url);
        if (doc) req.url = `/${documentPageFile(doc)}`;
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), devHead(), documentPages()],
  build: {
    // Never publish source maps (they'd expose the source on the public site).
    sourcemap: false,
    // Every asset is a real file (favicon included), never an inline data: URI.
    assetsInlineLimit: 0,
    // Two pages: the site (index.html) and the documents' pages (document.html).
    rollupOptions: { input: ["index.html", "document.html"] },
  },
  // PDF.js starts its worker as a module (PdfViewer.vue).
  worker: { format: "es" },
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
