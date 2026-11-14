import { createSSRApp, type Component } from "vue";
import { renderToString } from "vue/server-renderer";
import { buildHead } from "./site/head.ts";
import { asset, config, env } from "./site/site.ts";
import ErrorPage from "./pages/ErrorPage.vue";
import LandingPage from "./pages/LandingPage.vue";
import "./style.css";

/**
 * Build-time renderer, used only by scripts/prerender.ts (never shipped): the
 * HTML of each page and its <head>, for the environment this build targets.
 */

export interface RenderedPage {
  /** Output file in dist/. */
  file: string;
  /** Path it is listed at in the sitemap ("" for pages left out: error). */
  path: string;
  lang: string;
  head: string;
  html: string;
  /** Hydrated by the client bundle, or plain HTML (no scripts). */
  interactive: boolean;
}

function render(page: Component) {
  return renderToString(createSSRApp(page));
}

export async function renderPages(): Promise<RenderedPage[]> {
  return [
    {
      file: "index.html",
      path: "/",
      lang: config.lang,
      head: buildHead({ config, env, asset, path: "/" }),
      html: await render(LandingPage),
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
      html: await render(ErrorPage),
      interactive: false,
    },
  ];
}

export { config, env };
