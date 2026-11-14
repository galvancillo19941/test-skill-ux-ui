import { describe, expect, test } from "vite-plus/test";
import { fillTemplate, robotsTxt, sitemapXml } from "./prerender.ts";

const template = `<!doctype html>
<html lang="<!--app-lang-->">
  <head>
    <!--app-head-->
    <script type="module" crossorigin src="/assets/index-abc.js"></script>
    <link rel="modulepreload" crossorigin href="/assets/vendor-abc.js">
    <link rel="stylesheet" crossorigin href="/assets/index-abc.css">
  </head>
  <body>
    <div id="app"><!--app-html--></div>
  </body>
</html>`;

const page = {
  file: "index.html",
  path: "/",
  lang: "en",
  head: "<title>T</title>",
  html: "<main>$&</main>",
};

describe("fillTemplate", () => {
  test("fills lang, head and markup (literally: no $-patterns)", () => {
    const html = fillTemplate(template, { ...page, interactive: true });
    expect(html).toContain('<html lang="en">');
    expect(html).toContain("<title>T</title>");
    expect(html).toContain('<div id="app"><main>$&</main></div>');
    expect(html).toContain('src="/assets/index-abc.js"');
  });

  test("a plain page keeps the CSS but drops the client bundle", () => {
    const html = fillTemplate(template, { ...page, interactive: false });
    expect(html).not.toContain("<script");
    expect(html).not.toContain("modulepreload");
    expect(html).toContain('href="/assets/index-abc.css"');
  });

  test("a template without the markers fails the build", () => {
    expect(() => fillTemplate("<html></html>", { ...page, interactive: true })).toThrow(/app-lang/);
  });
});

describe("robots.txt / sitemap.xml", () => {
  test("test disallows everything; prod allows and points at the sitemap", () => {
    expect(robotsTxt("test", "https://test.example.com")).toBe("User-agent: *\nDisallow: /\n");
    expect(robotsTxt("prod", "https://www.example.com")).toBe(
      "User-agent: *\nAllow: /\n\nSitemap: https://www.example.com/sitemap.xml\n",
    );
  });

  test("sitemap lists absolute URLs with the build date", () => {
    const xml = sitemapXml("https://www.example.com", ["/"], new Date("2026-10-20T12:00:00Z"));
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain("<loc>https://www.example.com/</loc>");
    expect(xml).toContain("<lastmod>2026-10-20</lastmod>");
  });
});
