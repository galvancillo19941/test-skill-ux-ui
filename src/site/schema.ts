import { z } from "zod";

// Zod tests whether it may compile validators (`Function("")`), which the site's
// CSP forbids (no eval) and the browser reports. Plain validation is enough.
z.config({ jitless: true });

/**
 * Source-of-truth schema for `content/config.json` (the site's copy and
 * per-environment settings). The `SiteConfig` type is inferred from it, and
 * `site.ts` validates the config at load time — in the client build, the
 * prerender and the tests — so a missing or mistyped field fails the build
 * with a clear error instead of breaking silently at runtime.
 */

/** One deploy target (`deploy-test` / `deploy-prod` in Netflix's pipeline). */
const environmentSchema = z.strictObject({
  /**
   * Public origin of the site (`https://…`, no path). Used for canonical,
   * `og:url`, absolute share images, robots.txt and sitemap.xml. Required to
   * build prod; a test build without it skips the absolute URLs.
   */
  siteUrl: z
    .url({ protocol: /^https$/ })
    .refine((u) => new URL(u).pathname === "/" && !u.endsWith("/"), {
      error: "siteUrl is an origin only, e.g. https://www.example.com (no path, no trailing /).",
    })
    .optional(),
});

/** A language tag: `es`, `fr`, `pt-BR`. */
const localeSchema = z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, {
  error: "A language tag such as en, es or fr-CA.",
});

export const ENVIRONMENTS = ["test", "prod"] as const;
export type SiteEnv = (typeof ENVIRONMENTS)[number];

export const siteConfigSchema = z.object({
  name: z.string().min(1),
  /** The page's language. */
  lang: localeSchema.default("en"),

  /** Per-environment settings. The build picks one (`vp run build:test` / `build:prod`). */
  environments: z.strictObject({ test: environmentSchema, prod: environmentSchema }),

  /** SEO + social sharing metadata, written into the prerendered <head>. */
  seo: z
    .object({
      title: z.string().optional(),
      description: z.string().default(""),
      /** Share image (img/…; JPG or PNG, 1200×630 recommended — social sites don't read SVG). */
      image: z.string().optional(),
      imageAlt: z.string().default(""),
      imageWidth: z.number().int().positive().optional(),
      imageHeight: z.number().int().positive().optional(),
      favicon: z.string().optional(),
      twitterCard: z.enum(["summary", "summary_large_image"]).default("summary_large_image"),
      /** `twitter:site` handle, e.g. "@example". */
      twitterSite: z
        .string()
        .regex(/^@\w+$/)
        .optional(),
    })
    .prefault({}),

  /** The custom error page (error.html, what S3 serves for any missing path). */
  errorPage: z
    .object({
      title: z.string().default("Page not found"),
    })
    .prefault({}),
});

export type SiteConfig = z.infer<typeof siteConfigSchema>;
