import { z } from "zod";
import rawConfig from "../../content/config.json";
import "../../content/theme.css";
import { siteConfigSchema, type SiteConfig, type SiteEnv } from "./schema.ts";

/**
 * The site, resolved at build time: the validated `content/config.json`, the
 * environment this build targets and the build-hashed URLs of `content/img/`.
 * Shared by the client bundle, the prerender (SSR) and the tests.
 */

const assetModules = import.meta.glob<string>("../../content/img/**", {
  eager: true,
  query: "?url",
  import: "default",
});

/** `img/foo.png` → "/assets/foo-abc123.png" ("" if there is no such file). */
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
