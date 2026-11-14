import { z } from "zod";
import { dictionaryIssues } from "./i18n.ts";

// Zod tests whether it may compile validators (`Function("")`), which the site's
// CSP forbids (no eval) and the browser reports. Plain validation is enough.
z.config({ jitless: true });

/**
 * Source-of-truth schema for `content/config.json` (the site's copy, form and
 * per-environment endpoints). The `SiteConfig` type is inferred from it, and
 * `site.ts` validates the config at load time — in the client build, the
 * prerender and the tests — so a missing or mistyped field fails the build
 * with a clear error instead of breaking silently at runtime.
 */

/**
 * Universal Form v1 (`<universal-form>`), WITHOUT a campaign: the fields are
 * described here (`config.fields`, handed to the element's `config`), the form
 * only validates and fires `uf-submit`, and the page POSTs the entry to the
 * environment's `submitUrl` itself. Field properties are the ones the v1 bundle
 * reads, plus the page-side `dependsOn`, `validate` and `noteHtml` (stripped before v1).
 */
export const UNIVERSAL_FORM_V1_FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "number",
  "zipcode",
  "date",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "checkbox-group",
  "signature",
] as const;

const TYPES_WITH_OPTIONS = new Set(["select", "radio", "checkbox-group"]);

export const universalFormV1FieldSchema = z
  .strictObject({
    /** Key the value travels under in the submission (the program's field name). */
    name: z.string().min(1),
    type: z.enum(UNIVERSAL_FORM_V1_FIELD_TYPES),
    label: z.string(),
    /** Checkbox only: rich label (v1 keeps a, strong, em, br, p; links must be absolute http/https). */
    labelHtml: z.string().optional(),
    placeholder: z.string().optional(),
    required: z.boolean().default(false),
    /** Message under the field when it is required and empty. */
    errorMessage: z.string().optional(),
    options: z.array(z.strictObject({ label: z.string(), value: z.string() })).optional(),
    /**
     * Select only: draws v1's custom dropdown (with a search box) instead of the
     * browser's native popup, so its colors come from the `--uf-dropdown-*` /
     * `--uf-option-*` tokens.
     */
    filterable: z.boolean().optional(),
    /**
     * Page-side rule (not v1's): this field follows the value of another field,
     * which may live in another section. Stripped before the config reaches v1.
     */
    dependsOn: z
      .strictObject({
        /** `name` of the field it follows. */
        field: z.string().min(1),
        /** Disabled while that field has no value. */
        disabledWhenEmpty: z.boolean().default(false),
        /** Values of that field that hide this one (and clear what it held). */
        hiddenWhen: z.array(z.string()).default([]),
        /**
         * The only values of that field that show this one: with any other (or
         * none yet) it is hidden, cleared and not sent — so `required` only
         * applies while it shows.
         */
        shownWhen: z.array(z.string()).min(1).optional(),
        /** Per value of that field, the only option values offered; other values offer all. */
        optionsWhen: z.record(z.string(), z.array(z.string()).min(1)).default({}),
        /** Per value of that field, copy that replaces this one's own; other values keep it. */
        textWhen: z
          .record(
            z.string(),
            z.strictObject({
              label: z.string().optional(),
              placeholder: z.string().optional(),
              errorMessage: z.string().optional(),
            }),
          )
          .default({}),
      })
      .optional(),
    /**
     * Page-side rule (not v1's, which has no pattern check): the value must match
     * `pattern` (a full-match regular expression) or the entry is not sent and
     * `message` is shown. Checked only when the field has a value.
     */
    validate: z
      .strictObject({
        pattern: z.string().refine(isRegExp, { error: "Not a valid regular expression." }),
        message: z.string().min(1),
        /** Optional `inputmode` for the field's input (which keyboard phones show). */
        inputMode: z
          .enum(["text", "numeric", "decimal", "tel", "email", "url", "search"])
          .optional(),
        /** Optional `maxlength` for the field's input: no more characters can be typed or pasted. */
        maxLength: z.number().int().positive().optional(),
      })
      .optional(),
    /**
     * Page-side (not v1's): a notice drawn by the page under the field, below its
     * error. Trusted per-project HTML; links must be absolute https.
     */
    noteHtml: z.string().min(1).optional(),
  })
  .refine((f) => !TYPES_WITH_OPTIONS.has(f.type) || (f.options?.length ?? 0) > 0, {
    error: "This field type needs at least one option.",
    path: ["options"],
  });

export const universalFormV1Schema = z
  .object({
    /** v1 bundle, loaded once as `<script type="module">` in <head>. Never copied into the repo. */
    scriptUrl: z
      .url({ protocol: /^https$/ })
      .default("https://universal-form.onprobability.com/v1/dist/index.js"),
    /**
     * Optional Subresource Integrity hash for `scriptUrl` (`sha384-…`). Only
     * usable once Probability publishes a versioned, immutable bundle: with the
     * moving `v1/dist/index.js` any release of theirs would block the form.
     */
    scriptIntegrity: z
      .string()
      .regex(/^sha(256|384|512)-[A-Za-z0-9+/]+=*$/)
      .optional(),
    /**
     * `service/get-form-fields/<id>` — asked (read-only) for the `devForm` token
     * the submission service expects and for the campaign's opening and closing
     * dates (the form only shows between them). Omit to send without the token
     * and show the form at any time.
     */
    formFieldsUrl: z.url({ protocol: /^https$/ }).optional(),
    /**
     * v1 `skeleton` (single-form mode only): one entry per row, one CSS track per
     * column, consumed in field order. NOTE: v1 also draws a loading skeleton
     * while it loads whenever this is set.
     */
    skeleton: z.array(z.array(z.string().min(1)).min(1)).optional(),
    /** Passed as-is to the element's `config` attribute. */
    config: z.strictObject({
      fields: z
        .array(universalFormV1FieldSchema)
        .min(1)
        .refine((fields) => new Set(fields.map((f) => f.name)).size === fields.length, {
          error: "Field names must be unique.",
        })
        .superRefine((fields, ctx) => {
          const byName = new Map(fields.map((f) => [f.name, f]));
          fields.forEach((f, i) => {
            const dep = f.dependsOn;
            if (!dep) return;
            const path = [i, "dependsOn"];
            if (dep.field === f.name || !byName.has(dep.field)) {
              ctx.addIssue({
                code: "custom",
                message: `dependsOn.field "${dep.field}" is not another field.`,
                path: [...path, "field"],
              });
            }
            const sourceValues = byName.get(dep.field)?.options?.map((o) => o.value);
            if (sourceValues) {
              for (const key of ["hiddenWhen", "shownWhen"] as const) {
                for (const value of (dep[key] ?? []).filter((v) => !sourceValues.includes(v))) {
                  ctx.addIssue({
                    code: "custom",
                    message: `"${value}" is not one of "${dep.field}"'s options.`,
                    path: [...path, key],
                  });
                }
              }
            }
            const values = new Set(f.options?.map((o) => o.value));
            for (const [when, allowed] of Object.entries(dep.optionsWhen)) {
              for (const value of allowed.filter((v) => !values.has(v))) {
                ctx.addIssue({
                  code: "custom",
                  message: `Option "${value}" is not one of "${f.name}"'s options.`,
                  path: [...path, "optionsWhen", when],
                });
              }
            }
          });
        }),
      submit: z.strictObject({ label: z.string().optional() }).optional(),
      /** v1 locale + dictionaries (e.g. `{ "en": { "requiredLegend": "" } }` hides "* Required field"). */
      locale: z.string().optional(),
      i18n: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
    }),
    /**
     * Optional: one `<universal-form>` per section (each a single step without
     * buttons, its `titleHtml` in v1's `slot-step="1"`), with ONE submit button
     * drawn by the page. Every field of `config.fields` goes in exactly one
     * section. Without `sections` the form is a single `<universal-form>` that
     * draws its own button.
     */
    sections: z
      .array(
        z.strictObject({
          /** Slug: `universal-form[data-section="<id>"]` for CSS. */
          id: z.string().regex(/^[a-z0-9-]+$/),
          /** Block shown above the section's fields. Trusted per-project HTML. */
          titleHtml: z.string().default(""),
          /** `name`s of `config.fields`, in display order. */
          fields: z.array(z.string()).min(1),
          /**
           * Columns of the fields grid (CSS, `data-columns`; 1 column on mobile).
           * Not v1's `skeleton`, which also draws a loading skeleton.
           */
          columns: z.number().int().min(1).max(4).default(1),
        }),
      )
      .optional(),
    /**
     * Error messages from the submission service that get their own text: the
     * service's message (matched exactly) → what the page shows for it, in the
     * page's language (translated in `i18n` under `form.shownErrors.<message>`).
     * Any other refusal shows `messages.error`.
     */
    shownErrors: z.record(z.string().trim().min(1), z.string().trim().min(1)).default({}),
    /** Copy the page shows around the submission (the form itself has no say in it). */
    messages: z
      .object({
        sending: z.string().default("Sending…"),
        error: z.string().default("Your entry couldn't be sent. Please try again."),
        /** Page loader shown until the form is fully rendered. */
        loading: z.string().default("Loading…"),
        loadError: z.string().default("The form couldn't be loaded."),
        retry: z.string().default("Try again"),
      })
      .prefault({}),
  })
  .superRefine((v1, ctx) => {
    if (!v1.sections) return;
    const names = new Set(v1.config.fields.map((f) => f.name));
    const ids = new Set<string>();
    const assigned = new Set<string>();
    v1.sections.forEach((section, i) => {
      if (ids.has(section.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate section id "${section.id}".`,
          path: ["sections", i, "id"],
        });
      }
      ids.add(section.id);
      section.fields.forEach((field, j) => {
        const issue = !names.has(field)
          ? `Section field "${field}" is not in config.fields.`
          : assigned.has(field)
            ? `Field "${field}" is in more than one section.`
            : "";
        if (issue)
          ctx.addIssue({ code: "custom", message: issue, path: ["sections", i, "fields", j] });
        assigned.add(field);
      });
    });
    for (const name of names) {
      if (!assigned.has(name)) {
        ctx.addIssue({
          code: "custom",
          message: `Field "${name}" is not in any section.`,
          path: ["sections"],
        });
      }
    }
  });

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
  /** Where the page POSTs the entry (JSON). `/submission/<env>/<id>`. */
  submitUrl: z.url({ protocol: /^https$/ }),
});

/** A language's copy (see i18n.ts): nested texts, or lists of texts, under the config's keys. */
export type Dictionary = { [key: string]: string | string[] | Dictionary };
const dictionarySchema: z.ZodType<Dictionary> = z.lazy(() =>
  z.record(z.string(), z.union([z.string(), z.array(z.string()), dictionarySchema])),
);

/** A language tag: `es`, `fr`, `pt-BR`. */
const localeSchema = z.string().regex(/^[a-z]{2,3}(-[A-Z]{2})?$/, {
  error: "A language tag such as en, es or fr-CA.",
});

export const ENVIRONMENTS = ["test", "prod"] as const;
export type SiteEnv = (typeof ENVIRONMENTS)[number];

export const siteConfigSchema = z
  .object({
    name: z.string().min(1),
    /** The base language: its copy is this config, and the prerendered page speaks it. */
    lang: localeSchema.default("en"),

    /**
     * Every other language, by tag, first to last as the language menu lists
     * them: the browser shows the page with its dictionary applied (i18n.ts).
     */
    i18n: z.record(localeSchema, dictionarySchema).default({}),

    /** The language menu: this language's name in itself, and the menu's accessible label. */
    languageMenu: z
      .object({
        name: z.string().default(""),
        label: z.string().default("Language"),
      })
      .prefault({}),

    /** Per-environment endpoints. The build picks one (`vp run build:test` / `build:prod`). */
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
        /** `twitter:site` handle, e.g. "@netflix". */
        twitterSite: z
          .string()
          .regex(/^@\w+$/)
          .optional(),
      })
      .prefault({}),

    header: z.object({
      logo: z.string(),
      alt: z.string().default(""),
    }),

    hero: z.object({
      /** Small line above the headline. */
      eyebrow: z.string().default(""),
      titleHtml: z.string(),
      paragraphsHtml: z.array(z.string()).default([]),
    }),

    /**
     * After a successful submission the hero shows this copy and the form is
     * hidden. Leave `titleHtml` empty to keep the hero as it is.
     */
    thankYou: z
      .object({
        titleHtml: z.string().default(""),
        paragraphsHtml: z.array(z.string()).default([]),
      })
      .prefault({}),

    form: z.object({
      /** Optional heading shown above the form. */
      intro: z
        .object({
          title: z.string().default(""),
          description: z.string().default(""),
        })
        .prefault({}),
      universalV1: universalFormV1Schema,
    }),

    legal: z
      .object({
        personalizationDisclaimer: z.string().default(""),
        summaryHtml: z.string().default(""),
      })
      .prefault({}),

    /** The custom error page (error.html, what S3 serves for any missing path). */
    errorPage: z
      .object({
        title: z.string().default("Page not found"),
        message: z.string().default("The page you’re looking for doesn’t exist."),
        linkLabel: z.string().default("Go to the home page"),
      })
      .prefault({}),

    /**
     * Documents at their own URL (`/rules`, `/termsofuse`), each in one
     * language: its PDF (`docs/…`) served at that URL, or, while `file` is
     * empty, a blank page (see documents.ts).
     */
    documents: z
      .array(
        z.strictObject({
          path: z.string().regex(/^\/[a-z0-9-]+$/, {
            error: "One segment, lowercase, starting with /, e.g. /rules.",
          }),
          lang: localeSchema,
          title: z.string().min(1),
          file: z
            .string()
            .regex(/^docs\/[\w.-]+\.pdf$/, {
              error: "A PDF in content/docs/, e.g. docs/rules.pdf.",
            })
            .or(z.literal(""))
            .default(""),
        }),
      )
      .default([])
      .refine((docs) => new Set(docs.map((d) => d.path)).size === docs.length, {
        error: "Two documents share a path.",
      }),
  })
  // Every other language translates every text of the base copy, and nothing else.
  .superRefine((c, ctx) => {
    for (const [locale, dictionary] of Object.entries(c.i18n)) {
      if (locale === c.lang) {
        ctx.addIssue({
          code: "custom",
          message: `"${locale}" is the base language (lang): its copy is the config itself.`,
          path: ["i18n", locale],
        });
        continue;
      }
      for (const issue of dictionaryIssues(c, dictionary)) {
        ctx.addIssue({
          code: "custom",
          message: issue.message,
          path: ["i18n", locale, ...issue.key],
        });
      }
    }
  })
  // Never send real entries to test (or test entries to prod).
  .superRefine((c, ctx) => {
    for (const env of ENVIRONMENTS) {
      const url = c.environments[env].submitUrl;
      if (URL.canParse(url) && !new URL(url).pathname.includes(`/${env}/`)) {
        ctx.addIssue({
          code: "custom",
          message: `environments.${env}.submitUrl must contain /${env}/.`,
          path: ["environments", env, "submitUrl"],
        });
      }
    }
  });

function isRegExp(pattern: string): boolean {
  try {
    new RegExp(pattern);
    return true;
  } catch {
    return false;
  }
}

export type SiteConfig = z.infer<typeof siteConfigSchema>;
export type UniversalFormV1Config = z.infer<typeof universalFormV1Schema>;
export type UniversalFormV1Field = z.infer<typeof universalFormV1FieldSchema>;
