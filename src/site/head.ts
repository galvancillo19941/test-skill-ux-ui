import type { SiteConfig, SiteEnv } from "./schema.ts";

/**
 * The <head> of the prerendered pages, built at build time so crawlers and
 * social previews (which don't run JavaScript) see the real title, description,
 * Open Graph / Twitter tags, favicon and Content-Security-Policy.
 */

export interface HeadOptions {
  config: SiteConfig;
  env: SiteEnv;
  /** Resolves `img/…` to its build-hashed path. */
  asset: (relativePath: string) => string;
  /** Path of the page on the site ("/" for the landing page). */
  path?: string;
  /** Title override (e.g. the error page). */
  title?: string;
  /** Error page: never indexed, no canonical/social tags. */
  noindex?: boolean;
}

export function buildHead(options: HeadOptions): string {
  const { config, env, asset, path = "/", noindex = false } = options;
  const seo = config.seo;
  const siteUrl = config.environments[env].siteUrl;
  const title = options.title ?? seo.title ?? config.name;
  const description = seo.description || stripHtml(config.hero.titleHtml);
  const absolute = (p: string) => (siteUrl && p ? new URL(p, siteUrl).href : "");
  const pageUrl = absolute(path);
  const imagePath = seo.image ? asset(seo.image) : "";
  const imageUrl = absolute(imagePath);

  const tags: string[] = [
    `<title>${escapeHtml(title)}</title>`,
    meta("name", "description", description),
    `<meta http-equiv="Content-Security-Policy" content="${escapeHtml(contentSecurityPolicy(config, env))}" />`,
    `<meta name="referrer" content="strict-origin-when-cross-origin" />`,
  ];
  // Test builds are never indexed (robots.txt says the same); neither is the error page.
  if (noindex || env === "test") tags.push(meta("name", "robots", "noindex, nofollow"));
  if (seo.favicon && asset(seo.favicon)) {
    tags.push(`<link rel="icon" href="${escapeHtml(asset(seo.favicon))}" />`);
  }

  if (!noindex) {
    if (pageUrl) tags.push(`<link rel="canonical" href="${escapeHtml(pageUrl)}" />`);
    tags.push(
      meta("property", "og:site_name", config.name),
      meta("property", "og:type", "website"),
      meta("property", "og:title", title),
      meta("property", "og:description", description),
      meta("property", "og:url", pageUrl),
      meta("property", "og:image", imageUrl),
      meta("property", "og:image:secure_url", imageUrl),
      meta("property", "og:image:width", imageUrl ? String(seo.imageWidth ?? "") : ""),
      meta("property", "og:image:height", imageUrl ? String(seo.imageHeight ?? "") : ""),
      meta("property", "og:image:alt", imageUrl ? seo.imageAlt : ""),
      meta("name", "twitter:card", seo.twitterCard),
      meta("name", "twitter:site", seo.twitterSite ?? ""),
      meta("name", "twitter:title", title),
      meta("name", "twitter:description", description),
      meta("name", "twitter:image", imageUrl),
      meta("name", "twitter:image:alt", imageUrl ? seo.imageAlt : ""),
    );
  }
  return tags.filter(Boolean).join("\n    ");
}

/**
 * Only this site, the Universal Form bundle (and its lazy chunks, same origin)
 * and the Probability API. Styles allow inline: v1's Lit fields set style
 * attributes. Delivered as <meta> (S3 can't send headers), so `frame-ancestors`
 * has to come from CloudFront if Netflix enables a response-headers policy.
 */
export function contentSecurityPolicy(config: SiteConfig, env: SiteEnv): string {
  const v1 = config.form.universalV1;
  const origin = (url: string | undefined) => (url ? new URL(url).origin : "");
  const api = [...new Set([origin(config.environments[env].submitUrl), origin(v1.formFieldsUrl)])];
  return [
    "default-src 'self'",
    `script-src 'self' ${origin(v1.scriptUrl)}`,
    `connect-src 'self' ${api.filter(Boolean).join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

function meta(keyAttr: "name" | "property", key: string, content: string): string {
  return content ? `<meta ${keyAttr}="${key}" content="${escapeHtml(content)}" />` : "";
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
