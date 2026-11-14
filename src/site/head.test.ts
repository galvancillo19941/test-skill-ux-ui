import { describe, expect, test } from "vite-plus/test";
import rawConfig from "../../content/config.json";
import { buildHead, contentSecurityPolicy } from "./head.ts";
import { siteConfigSchema, type SiteConfig } from "./schema.ts";

const base = siteConfigSchema.parse(rawConfig);
const asset = (path: string) => (path ? `/assets/${path.replace("img/", "")}` : "");
const withProd = (patch: Partial<SiteConfig["seo"]> = {}): SiteConfig => ({
  ...base,
  environments: {
    ...base.environments,
    prod: { ...base.environments.prod, siteUrl: "https://www.example.com" },
  },
  seo: { ...base.seo, ...patch },
});

describe("buildHead", () => {
  test("title, description, favicon and the CSP are always there", () => {
    const config = withProd({
      title: "Example",
      description: "An example page.",
      favicon: "img/favicon.png",
    });
    const head = buildHead({ config, env: "test", asset });
    expect(head).toContain("<title>Example</title>");
    expect(head).toContain('<meta name="description" content="An example page." />');
    expect(head).toContain('<link rel="icon" href="/assets/favicon.png" />');
    expect(head).toContain('http-equiv="Content-Security-Policy"');
  });

  test("test builds are noindex; prod builds are not", () => {
    expect(buildHead({ config: base, env: "test", asset })).toContain("noindex, nofollow");
    expect(buildHead({ config: withProd(), env: "prod", asset })).not.toContain("noindex");
  });

  test("prod with siteUrl: canonical, og:url and absolute share image", () => {
    const head = buildHead({
      config: withProd({
        image: "img/share.jpg",
        imageWidth: 1200,
        imageHeight: 630,
        twitterSite: "@example",
      }),
      env: "prod",
      asset,
    });
    expect(head).toContain('<link rel="canonical" href="https://www.example.com/" />');
    expect(head).toContain('<meta property="og:url" content="https://www.example.com/" />');
    expect(head).toContain(
      '<meta property="og:image" content="https://www.example.com/assets/share.jpg" />',
    );
    expect(head).toContain('<meta property="og:image:width" content="1200" />');
    expect(head).toContain('<meta name="twitter:site" content="@example" />');
  });

  test("without siteUrl there are no relative og:url / og:image (crawlers need absolute)", () => {
    const head = buildHead({ config: base, env: "test", asset });
    expect(head).not.toContain("og:url");
    expect(head).not.toContain("canonical");
    expect(head).toContain('<meta property="og:title"');
  });

  test("the error page has no canonical or social tags and is never indexed", () => {
    const head = buildHead({ config: withProd(), env: "prod", asset, noindex: true, title: "404" });
    expect(head).toContain("<title>404</title>");
    expect(head).toContain("noindex, nofollow");
    expect(head).not.toContain("og:");
    expect(head).not.toContain("canonical");
  });

  test("copy is escaped", () => {
    const head = buildHead({ config: base, env: "test", asset, title: '"><script>x</script>' });
    expect(head).toContain("<title>&quot;&gt;&lt;script&gt;x&lt;/script&gt;</title>");
  });
});

describe("contentSecurityPolicy", () => {
  test("only this site", () => {
    const csp = contentSecurityPolicy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self';");
    expect(csp).toContain("connect-src 'self';");
    expect(csp).toContain("object-src 'none'");
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });
});
