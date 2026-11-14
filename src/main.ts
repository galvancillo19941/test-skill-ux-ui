import { createApp, createSSRApp, type App } from "vue";
import LandingPage from "./pages/LandingPage.vue";
import { localize, savedLocale } from "./site/i18n.ts";
import { config, siteKey } from "./site/site.ts";
import "./style.css";

// The language is never in the URL: "/" is prerendered in the base language,
// which is what shows until the language menu picks another. The menu switches
// it in place by drawing a new app, and the browser remembers the pick (only the
// language tag, in localStorage) for the next load. Storage may be off (private
// windows, blocked site data): then it is the base language every time.
const STORAGE_KEY = "site-language";
let app: App | undefined;

function readSaved(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function save(locale: string) {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Not remembered: the switch still happens.
  }
}

function mount(locale: string, fromMenu = false) {
  const site = localize(config, locale);
  document.documentElement.lang = locale;
  document.title = site.seo.title ?? site.name;
  if (site.seo.description) {
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute("content", site.seo.description);
  }

  // Builds prerender the base language into #app (scripts/prerender.ts): hydrate
  // it when that is the one to show. Otherwise (another language, a switch, or
  // `vp dev`, which serves an empty #app) render from scratch.
  const hydrate = !app && locale === config.lang && document.getElementById("app")?.hasChildNodes();
  app?.unmount();
  app = hydrate ? createSSRApp(LandingPage) : createApp(LandingPage);
  app.provide(siteKey, {
    locale,
    config: site,
    switchLocale: (next) => {
      save(next);
      mount(next, true);
    },
    fromMenu,
  });
  app.mount("#app");
}

mount(savedLocale(config, readSaved()));
