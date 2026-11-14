import { inject, type InjectionKey } from "vue";
import { z } from "zod";
import rawConfig from "../../content/config.json";
import "../../content/theme.css";
import { siteConfigSchema, type SiteConfig, type SiteEnv } from "./schema.ts";

/**
 * The site, resolved at build time: the validated `content/config.json`, the
 * environment this build targets and the build-hashed URLs of `content/img/`
 * and `content/docs/`.
 * Shared by the client bundle, the prerender (SSR) and the tests.
 *
 * `config` is the base language's copy. The app renders in one language: it
 * provides that language's site (`siteKey`, see i18n.ts) and components read it
 * with `useSite()`. Another language is a new app (main.ts), never a new URL.
 */

const assetModules = import.meta.glob<string>(["../../content/img/**", "../../content/docs/**"], {
  eager: true,
  query: "?url",
  import: "default",
});

/** `img/foo.png` → "/assets/foo-abc123.png" ("" if there is no such file); same for `docs/…`. */
export function asset(relativePath: string): string {
  return assetModules[`../../content/${relativePath}`] ?? "";
}

export function parseConfig(raw: unknown): SiteConfig {
  const result = siteConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(`Invalid content/config.json:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

/** `vp build --mode prod` targets prod; any other mode (dev, test) targets test. */
export const env: SiteEnv = import.meta.env.MODE === "prod" ? "prod" : "test";

export const config = parseConfig(rawConfig);
export const environment = config.environments[env];

/** The app's language and the config in it. */
export interface LocalizedSite {
  locale: string;
  config: SiteConfig;
  /** In the browser: redraws the site in another language (the prerender has none). */
  switchLocale?: (locale: string) => void;
  /** This app was drawn by the language menu, which takes the focus back. */
  fromMenu?: boolean;
}

export const siteKey: InjectionKey<LocalizedSite> = Symbol("site");

/** The site in the app's language (the base one when no app provided it). */
export const useSite = (): LocalizedSite => inject(siteKey, { locale: config.lang, config });
