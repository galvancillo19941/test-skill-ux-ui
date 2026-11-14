# Stranger Things Day Developer Contest — static site

Entry page for the Netflix × Roblox **Stranger Things Day Developer Contest**,
built by Probability, to be hosted on Netflix's **static** microsite
infrastructure (GitHub → AWS CodePipeline/CodeBuild → S3 → CloudFront).

It is a fully static site (HTML, CSS, JS — no server code). The page is
prerendered at build time (Vue 3 SSR → plain HTML) and hydrated in the browser.
Entries are sent from the browser to Probability's submission API; the site
keeps no entry data and sets no cookies (the browser only remembers the language
picked in the menu).

## Stack

- Vue 3 + TailwindCSS v4, built with [Vite+](https://viteplus.dev) (`vp`)
- Zod for the content schema (`content/config.json` is validated at build time)
- Probability **Universal Form v1** (`<universal-form>`), loaded at runtime
- Fonts self-hosted from `@fontsource` (Bebas Neue, Poppins)
- [GSAP](https://gsap.com/docs/v3/) for every animation, bundled from npm
  (`src/site/motion.ts`; none when the visitor asks for reduced motion)

Node ≥ 24 and Vite+ are required.

## Commands

```bash
vp install            # install dependencies
vp dev                # local dev server (client-side render, test environment)
vp test               # unit tests
vp check              # format + lint + type check
vp run build:test     # static build for the test environment → dist/
vp run build:prod     # static build for production → dist/
vp preview            # serve dist/ locally
```

## Layout

```
content/              — the site's CONTENT (edit these to change copy/looks)
  config.json         — copy, form fields, per-environment endpoints, SEO,
                        and the other languages' dictionaries (`i18n`)
  theme.css           — the site's styles (scoped under .site)
  img/                — images (logo, favicon, icons)
  docs/               — PDFs of the documents (terms of use, rules)
src/
  pages/              — LandingPage (/, every language), ErrorPage (error.html)
                        and DocumentPage (/termsofuse, /rules, …)
  components/         — LanguageSwitcher, HeroIntro, EntryForm, LegalSummary,
                        PdfViewer
    universal-form-v1/  — the Universal Form v1 integration (load, sections,
                          dependent fields, validation rules, submission)
  site/               — schema.ts (config schema), site.ts (resolved config),
                        i18n.ts (languages), head.ts (<head> + CSP built at
                        build time)
  main.ts             — client entry (hydrates the prerendered page)
  document.ts         — client entry of the documents' pages (document.html)
  entry-server.ts     — build-time renderer (never shipped)
scripts/
  build.ts            — type-check → client build → SSR build → prerender
  prerender.ts        — writes index.html, error.html, robots.txt, sitemap.xml
docs/openapi.yaml     — the Probability endpoints the browser calls
SECURITY.md           — Netflix security requirements and how this site meets them
```

## Languages

English (`lang`) is the base: its copy is `content/config.json` itself. Every
other language is a dictionary in `i18n` (today `es` and `fr`, listed in that
order in the language menu). Same logic as Universal Form's i18n: the
dictionaries travel inline in the config.

**The language is never in the URL.** There is one page, `/`, prerendered in
English, and English is what every visitor gets by default (the browser's own
language plays no part). The language menu switches it in place (what was
typed in the form starts over) and the browser remembers that pick — only the
language tag, in `localStorage` (`site-language`) — so a reload or the next
visit shows the last language chosen. Where storage is off (private windows,
blocked site data) it is English every time.

A dictionary follows the config's copy, with fields keyed by `name`, options by
`value` and sections by `id`:

```jsonc
"i18n": {
  "es": {
    "languageMenu": { "name": "Español", "label": "Idioma" },
    "hero": { "eyebrow": "CONCURSO PARA DESARROLLADORES", … },
    "form": {
      "sections": { "about-you": { "titleHtml": "…Sobre Ti…" } },
      "fields": {
        "first_name": { "label": "NOMBRE", "placeholder": "p. ej. Jim", "errorMessage": "…" },
        "country": { …, "options": { "mexico": "México" } }
      },
      "submit": { "label": "ENVIAR" },
      "messages": { … }
    },
    "legal": { "summaryHtml": "…" }
  }
}
```

The build **fails** when a dictionary misses a text of the base copy or has a key
that translates nothing, so a change to the English copy must be made in every
language. Option labels are the exception: one a dictionary leaves out keeps its
English (most state and province names). Field names and option values never change — only
what the visitor reads. Universal Form's own words (the e-mail format error, the
select's search box) are in `form.universalV1.config.i18n`, one entry per
language. To add a language: a new key in `i18n` with the full dictionary, and
its entry in `form.universalV1.config.i18n`.

## Documents

`content/config.json` → `documents`: the legal documents, each at its own URL
and in one language (`/termsofuse` and `/rules` in English, `/termsofuse-es`
and `/rules-es` in Spanish, `/termsofuse-fr` and `/rules-fr` in French). Each is a page of the site, prerendered to `dist/<path>/index.html`
(S3 and nginx serve `/termsofuse/` from it and redirect `/termsofuse` there),
that shows the document's PDF (`file`, in `content/docs/`) right in the page:
the URL stays `/termsofuse`. The PDF is drawn page by page with PDF.js
(`pdfjs-dist`, bundled: no third party), since phones can't be trusted to show
a PDF inside a page (Android's Chrome shows nothing in an `<iframe>`). Until a
document has its PDF, `file` is empty and its page is blank (no scripts). To
publish one, put the PDF in `content/docs/` and set `file` (e.g.
`docs/rules.pdf`).

The pages come from their own template and client entry (`document.html`,
`src/document.ts`), so they don't load the site's form. `vp dev` and
`vp preview` serve them at their URL too (`documentPages` in vite.config.ts).

The eligibility checkbox links to the rules and terms of use from its
`labelHtml`: English to `/rules` and `/termsofuse`, Spanish to `/rules-es` and
`/termsofuse-es`, French to `/rules-fr` and `/termsofuse-fr`. Universal Form keeps a link in a
label only with an absolute URL, so the page makes site paths absolute in the
browser (`labelLinks.ts`).

## Opening and closing

The form opens and closes by itself with the campaign's dates in Probability.
On load, in parallel with the form, the page asks
`form.universalV1.formFieldsUrl` (`service/get-form-fields/<program>`) ONCE:
the same answer brings the `devForm` token and `data.dateValidations`
(`useEntrySubmission.ts`, `campaignDates.ts`). Until it answers only the loader
shows; if it fails
(network, a non-2xx such as Probability's 403 "Invalid origin" for a domain
not on the campaign's list, not JSON, no dates) the loader stays and the
console says why — the form never opens by default.

| Now (to the second)          | The page shows                               |
| ---------------------------- | -------------------------------------------- |
| up to `startDate` (included) | the thank-you screen with `startDateMessage` |
| between the two dates        | the form                                     |
| from `endDate` (included) on | the thank-you screen with `endDateMessage`   |

The messages are Probability's, as they come (not translated), with
`data-phase="upcoming" | "closed"` on `.hero-form` for theme.css; the legal
summary stays under them. The phase is checked every second while the tab is
visible (and at once when it comes back), so the form opens and closes without a
reload. An entry being sent, or its thanks or error on screen, stays as is.

Every domain the site is served from (localhost, Coolify, Netflix test and
prod) must be on the campaign's list in Probability. To try the phases in
`vp dev`, add `?campaign-now=<ISO date-time>` (e.g.
`?campaign-now=2026-11-26T23:21:55Z`): the clock starts at that instant. It does
nothing in builds.

## Environments

`content/config.json` → `environments.test` / `environments.prod`:

| Key         | Meaning                                                                        |
| ----------- | ------------------------------------------------------------------------------ |
| `submitUrl` | Probability submission endpoint (`/submission/<env>/<id>`; must match the env) |
| `siteUrl`   | Public origin (`https://www.…`, no path). **Required for `build:prod`**        |

What changes per build:

| Build        | Submissions go to   | robots.txt               | `<meta name="robots">` | sitemap.xml           |
| ------------ | ------------------- | ------------------------ | ---------------------- | --------------------- |
| `build:test` | `/submission/test/` | `Disallow: /`            | `noindex, nofollow`    | only if `siteUrl` set |
| `build:prod` | `/submission/prod/` | `Allow: /` + sitemap URL | —                      | yes                   |

## Build output (`dist/`)

```
index.html    — prerendered landing page in English (real markup, title,
                description, Open Graph / Twitter tags, CSP) + the client bundle
error.html    — custom error page, no JavaScript (S3 serves it for missing paths)
termsofuse/index.html, termsofuse-es/index.html, termsofuse-fr/index.html,
rules/index.html, rules-es/index.html, rules-fr/index.html
              — the documents' pages (see Documents)
robots.txt
sitemap.xml   — prod (or whenever siteUrl is set)
assets/       — hashed JS, CSS, fonts, images
```

No source maps are emitted. Every page is a real file, so S3 needs no rewrites.

## Deploying to Netflix

Netflix provides a GitHub repository with two branches; any push deploys:

- `deploy-test` → staging S3 bucket
- `deploy-prod` → production S3 bucket

The build for each branch is `vp run build:test` / `vp run build:prod`, and the
content of `dist/` is what goes to the bucket root. **To confirm with Netflix:**
whether their CodeBuild runs the build (it needs Node 24 + `vp install`) or
expects the built files committed to the deploy branches.

## Preview on Probability's Coolify

`nixpacks.toml` builds the **test** environment for the Coolify preview
(static site, publish directory `dist`), behind HTTP Basic Auth.

## Pending before production

See [SECURITY.md](SECURITY.md#pending) for the full list. In short: Netflix
AppSec review (the site handles PI), the production domain (`siteUrl`), a share
image (1200×630 JPG/PNG), Google Analytics IDs, and confirmations from
Probability (prod submission URL, log retention, server-side validation).
