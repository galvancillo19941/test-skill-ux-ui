import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { RenderedPage } from "../src/entry-server.ts";
import type { SiteConfig, SiteEnv } from "../src/site/schema.ts";

/**
 * Writes the static site into `outDir` from the client build's index.html
 * (which carries the hashed script/CSS tags) and the server renderer:
 *
 *   index.html  — prerendered markup + <head> in the base language, hydrated by
 *                 the client bundle (which shows the language last picked in the menu)
 *   error.html  — prerendered, no scripts (what S3 serves for missing paths)
 *   <path>/index.html — each document's page (`termsofuse/index.html`), from
 *                 the client build's document.html, which is then removed
 *   robots.txt  — test: disallow everything; prod: allow + sitemap
 *   sitemap.xml — every indexable page (needs the environment's siteUrl)
 */

interface ServerEntry {
  renderPages: () => Promise<RenderedPage[]>;
  config: SiteConfig;
  env: SiteEnv;
}

export async function prerender(options: {
  env: SiteEnv;
  outDir: string;
  ssrEntry: string;
}): Promise<void> {
  const { env, outDir } = options;
  const entry = (await import(pathToFileURL(resolve(options.ssrEntry)).href)) as ServerEntry;
  if (entry.env !== env) throw new Error(`Renderer was built for "${entry.env}", not "${env}".`);

  const siteUrl = entry.config.environments[env].siteUrl;
  if (env === "prod" && !siteUrl) {
    throw new Error(
      "environments.prod.siteUrl is missing in content/config.json (the production " +
        "domain, e.g. https://www.example.com) — needed for canonical, og:url and sitemap.xml.",
    );
  }

  const templates = new Map<string, string>();
  const templateOf = (page: RenderedPage) => {
    const name = page.template ?? "index.html";
    if (!templates.has(name)) templates.set(name, readFileSync(join(outDir, name), "utf8"));
    return templates.get(name)!;
  };
  const pages = await entry.renderPages();
  for (const page of pages) {
    const template = templateOf(page);
    const file = join(outDir, page.file);
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, fillTemplate(template, page));
    console.log(`prerendered ${page.file}`);
  }
  // A template, not a page: its pages are each document's <path>/index.html.
  rmSync(join(outDir, "document.html"), { force: true });

  writeFileSync(join(outDir, "robots.txt"), robotsTxt(env, siteUrl));
  console.log("wrote robots.txt");
  if (siteUrl) {
    const paths = pages.filter((p) => p.path).map((p) => p.path);
    writeFileSync(join(outDir, "sitemap.xml"), sitemapXml(siteUrl, paths, new Date()));
    console.log("wrote sitemap.xml");
  }
}

export function fillTemplate(template: string, page: RenderedPage): string {
  const filled = [
    ["<!--app-lang-->", page.lang],
    ["<!--app-head-->", page.head],
    ["<!--app-html-->", page.html],
  ].reduce((html, [marker, value]) => {
    if (!html.includes(marker!)) throw new Error(`index.html has no ${marker} marker.`);
    return html.replace(marker!, () => value!);
  }, template);
  if (page.interactive) return filled;
  // Plain page: drop the client bundle (module script + its preloads), keep the CSS.
  return filled
    .replace(/\s*<script type="module"[^>]*><\/script>/g, "")
    .replace(/\s*<link rel="modulepreload"[^>]*>/g, "");
}

export function robotsTxt(env: SiteEnv, siteUrl?: string): string {
  if (env === "test") return "User-agent: *\nDisallow: /\n";
  return `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ""}`;
}

export function sitemapXml(siteUrl: string, paths: string[], lastmod: Date): string {
  const day = lastmod.toISOString().slice(0, 10);
  const urls = paths
    .map(
      (path) =>
        `  <url>\n    <loc>${new URL(path, siteUrl).href}</loc>\n    <lastmod>${day}</lastmod>\n` +
        `    <changefreq>weekly</changefreq>\n    <priority>${path === "/" ? "1.0" : "0.8"}</priority>\n  </url>`,
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}
