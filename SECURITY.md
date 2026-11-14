# Security

How this site meets Netflix's _Microsites Security Reference_ and what is still
pending. The site is static: no server code, no database, no login, no cookies,
no secrets.

## Architecture

```
Browser ──GET──▶ CloudFront ─▶ S3 (this repo's dist/: HTML, CSS, JS, fonts, images)
   │
   ├──GET──▶ https://universal-form.onprobability.com/v1/releases/1.0.0/index.js  (form UI, SRI)
   │
   └──POST─▶ https://api.helloprobability.io
              ├─ /service/get-form-fields/<program>   (devForm token and campaign dates, no PI)
              └─ /submission/<test|prod>/<program>    (the entry, PI)
```

The entry goes straight from the browser to Probability; it never touches
Netflix infrastructure or this repo. Endpoints are documented in
[docs/openapi.yaml](docs/openapi.yaml).

## Personal information collected

| Field                                        | Why it is needed                               |
| -------------------------------------------- | ---------------------------------------------- |
| First name, last name                        | Identify the entrant / winner                  |
| Email                                        | Contact the entrant (results, prize)           |
| Country, city, state / province / territory  | Eligibility (legal residents of US/DC, CA, MX) |
| Entry category, license type, state of game  | Judging criteria                               |
| Roblox Creator ID, experience URL            | Locate and judge the submitted work            |
| Eligibility checkbox (18+, residency, rules) | Consent; a checkbox instead of a date of birth |

Visit metadata sent with the entry: page URL, referrer, user agent and UTM
parameters (attribution). **To review with legal/Netflix:** whether `city` and
the visit metadata are necessary (minimization).

## Netflix requirements

| Requirement                             | Status | How                                                                                                                                                                                                                                              |
| --------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Security review by Netflix AppSec (PI)  | ⏳     | To request via `#security-help`, with the legal contact                                                                                                                                                                                          |
| Source code available before production | ✅     | This repository                                                                                                                                                                                                                                  |
| Route / API listing (OpenAPI)           | ✅     | [docs/openapi.yaml](docs/openapi.yaml); the site itself serves `/` (every language, picked in the menu) and the documents' pages `/termsofuse`, `/termsofuse-es`, `/termsofuse-fr`, `/rules`, `/rules-es`, `/rules-fr` (a PDF shown in the page) |
| Application logs kept ≥ 1 year          | ⏳     | The site has no backend; Probability must confirm retention for its API                                                                                                                                                                          |
| PI minimization                         | ⚠️     | Checkbox instead of DOB; `city` and metadata to be confirmed (see above)                                                                                                                                                                         |
| No secrets in code                      | ✅     | None exist; `.gitignore` blocks `.env*`, keys, `.DS_Store`, databases                                                                                                                                                                            |
| Login / session management              | ✅ N/A | No login, no sessions                                                                                                                                                                                                                            |
| TLS 1.3, HTTP → HTTPS                   | ✅     | Netflix CloudFront; the page also sends `upgrade-insecure-requests`                                                                                                                                                                              |
| Input validation                        | ⚠️     | Client: required fields, email, Creator ID 9 digits, `http(s)://` link with a domain. Server-side validation is Probability's — to confirm                                                                                                       |
| Prepared statements / SQL               | ✅ N/A | No database                                                                                                                                                                                                                                      |
| Admin panel                             | ✅ N/A | None                                                                                                                                                                                                                                             |
| Dependency security                     | ✅     | `vp pm audit`: 0 known vulnerabilities; only maintained packages                                                                                                                                                                                 |
| IDOR                                    | ✅ N/A | No objects served per user                                                                                                                                                                                                                       |
| Framework (CMS) security                | ✅ N/A | No CMS                                                                                                                                                                                                                                           |
| Debug mode off in production            | ✅     | Production bundle logs nothing about API answers (only, when the campaign dates can't be had, why: e.g. `HTTP 403`); no source maps                                                                                                              |
| Cookies                                 | ✅     | The site sets none (CloudFront drops them anyway)                                                                                                                                                                                                |
| Embedded video                          | ✅ N/A | None                                                                                                                                                                                                                                             |

## Hardening in place

- **Content-Security-Policy** (as `<meta>`, S3 can't send headers): only
  `'self'`, the Universal Form bundle origin and the Probability API; no inline
  or eval'd scripts; `object-src 'none'`. Built in `src/site/head.ts`.
- **Third parties**: fonts are self-hosted (no Google Fonts). The only external
  script is Probability's Universal Form bundle, pinned: a frozen release
  (`/v1/releases/1.0.0/`, committed once in Probability's `universal-form`
  repo and never rebuilt) loaded with Subresource Integrity
  (`form.universalV1.scriptIntegrity`), so a changed `index.js` is refused by
  the browser. SRI covers the entry; the chunks it imports have no integrity
  attribute (dynamic imports can't carry one under this CSP) but come from the
  same frozen folder under content-hashed names. A new form version is a new
  release, a new URL and a new hash here. The documents' pages draw
  their PDF with PDF.js (Mozilla's `pdfjs-dist`), bundled into the site's own
  assets (library and worker from `'self'`), and only links of the PDF that
  are `http(s):` or `mailto:` are made clickable. The animations use GSAP
  (`gsap` on npm), bundled the same way: no CDN, no new origin.
- **No PI in URLs, storage or cookies**: entries are POSTed as JSON bodies.
  The only thing kept in the browser is the language picked in the menu
  (`localStorage` `site-language`: `en`, `es` or `fr`), so a reload keeps it.
- **HTML from config only**: `v-html` / `innerHTML` render copy from
  `content/config.json`, written by the team and compiled into the build —
  never user input. (Static scanners flag these; they are not user-controlled.)
- **`noindex` + `Disallow: /`** on every test build.
- **Build pipeline**: Netflix's CodeBuild (`buildspec.yml` in Netflix's repo)
  installs with `pnpm install --frozen-lockfile`, so it gets exactly the
  versions and integrity hashes in `pnpm-lock.yaml` and fails rather than
  resolve anything new. `vite` is aliased to
  `npm:@voidzero-dev/vite-plus-core` on purpose: it is the Vite+ toolchain
  (`vp`), by VoidZero, the Vite team; it is pinned in the lockfile like any
  other package.

## Pending

1. Netflix AppSec security review (PI) — include the legal contact.
2. Probability: confirm the production submission URL
   (`environments.prod.submitUrl`), log retention ≥ 1 year, server-side
   validation (allow-lists) and rate limiting / bot protection.
3. Netflix: CloudFront response headers on test and prod — HSTS,
   `frame-ancestors 'none'` / `X-Frame-Options: DENY`,
   `X-Content-Type-Options: nosniff`, `Referrer-Policy` — and HTTP → HTTPS
   redirect. A `<meta>` CSP can't
   set `frame-ancestors`; the site is never framed (documents are drawn with
   PDF.js, no `<iframe>`), so `'none'` breaks nothing. Raised by Netflix AppSec
   (low: clickjacking on the form, first-visit downgrade).
4. Netflix: confirm the CodeBuild role can only write the site's bucket and
   invalidate its distribution; Netflix reviews every merge to `deploy-prod`;
   and whether packages should resolve from a Netflix registry (then an
   `.npmrc` is added here). Raised by Netflix AppSec (to verify).
5. Netflix: is the Activation/Microsite Cookie Tool (OneTrust) required once
   Google Analytics is added?

## Reporting

Netflix AppSec scans the Netflix-provided repository every 24 h and opens
GitHub Issues (medium and above). Fix within: critical 3, high 5, medium 15
business days. False positives: explain in the issue and close it. Contact:
appsec@netflix.com.
