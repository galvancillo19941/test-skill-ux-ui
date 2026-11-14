import { createSSRApp, type Component } from "vue";
import { renderToString } from "vue/server-renderer";
import { documentPageFile } from "./site/documents.ts";
import { buildHead } from "./site/head.ts";
import { localize } from "./site/i18n.ts";
import { asset, config, env, siteKey, type LocalizedSite } from "./site/site.ts";
import DocumentPage from "./pages/DocumentPage.vue";
import ErrorPage from "./pages/ErrorPage.vue";
import LandingPage from "./pages/LandingPage.vue";
import "./style.css";

/**
 * Build-time renderer, used only by scripts/prerender.ts (never shipped): the
 * HTML of each page and its <head>, for the environment this build targets.
 * The landing page at "/" and the error page, in the base language (the browser
 * switches the landing page to the language last picked in its menu, see
 * main.ts), and each document's page (DocumentPage) in its own language.
 */

export interface RenderedPage {
  /** Output file in dist/. */
  file: string;
  /** Path it is listed at in the sitemap ("" for pages left out: error, documents). */
  path: string;
  lang: string;
  head: string;
  html: string;
  /** Hydrated by the client bundle, or plain HTML (no scripts). */
  interactive: boolean;
  /** The client build's HTML it fills: index.html, or document.html (src/document.ts). */
  template?: "document.html";
}

function render(page: Component, site: LocalizedSite, props?: Record<string, unknown>) {
  const app = createSSRApp(page, props);
  app.provide(siteKey, site);
  return renderToString(app);
}

export async function renderPages(): Promise<RenderedPage[]> {
  // The same site the client hydrates in the base language (main.ts).
  const landing = { locale: config.lang, config: localize(config, config.lang) };
  return [
    {
      file: "index.html",
      path: "/",
      lang: config.lang,
      head: buildHead({ config, env, asset, path: "/" }),
      html: await render(LandingPage, landing),
      interactive: true,
    },
    {
      file: "error.html",
      path: "",
      lang: config.lang,
      head: buildHead({
        config,
        env,
        asset,
        title: `${config.errorPage.title} — ${config.name}`,
        noindex: true,
      }),
      html: await render(ErrorPage, { locale: config.lang, config }),
      interactive: false,
    },
    ...(await Promise.all(
      config.documents.map(async (doc) => {
        if (doc.file && !asset(doc.file))
          throw new Error(`${doc.path}: content/${doc.file} not found.`);
        return {
          file: documentPageFile(doc),
          path: "",
          lang: doc.lang,
          head: buildHead({
            config,
            env,
            asset,
            title: `${doc.title} — ${config.name}`,
            noindex: true,
          }),
          html: await render(DocumentPage, { locale: doc.lang, config }, { doc }),
          // Blank until it has its PDF: no script to load.
          interactive: Boolean(doc.file),
          template: "document.html" as const,
        };
      }),
    )),
  ];
}

export { config, env };
