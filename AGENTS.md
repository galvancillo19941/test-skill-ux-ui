# Agent notes

Static site for the Stranger Things Day Developer Contest, hosted on Netflix's
static microsite infrastructure (S3 + CloudFront). Read README.md and
SECURITY.md first.

## Toolchain: Vite+ (`vp`)

- Use `vp` for everything: `vp install`, `vp dev`, `vp test`, `vp check`,
  `vp run build:test`, `vp run build:prod`. Never pnpm/npm/yarn directly; use
  `vp dlx` instead of `npx`.
- Import from `vite-plus` (`defineConfig`) and `vite-plus/test` (tests).
- Before finishing: `vp check` and `vp test` pass, and `vp run build:test` builds.

## Rules

- **Static only.** No server code, API, database, auth or Docker in this repo.
  Netflix scans it every 24 h; anything here must be needed by the site.
- **Content vs. code.** Copy, fields, endpoints and SEO live in
  `content/config.json` (validated by `src/site/schema.ts` — add fields there),
  looks in `content/theme.css`. Change code only to change behavior.
- **Security.** No secrets, no third-party scripts/fonts/trackers beyond what
  SECURITY.md lists — adding an origin means updating the CSP
  (`src/site/head.ts`) and SECURITY.md. No PI in URLs, storage or cookies.
  Production builds don't log API answers; no source maps.
- **Prerender.** Pages must render on the server (no `window`/`document` at
  setup; browser work goes in `onMounted`). Every route is a real HTML file.
- **Components.** One component per file; pages only compose components.
- Don't start long-running dev servers without asking the user.
- Don't create git branches unless asked.
- **Do only what is asked.** No extra features, refactors, effects or
  "improvements" beyond the request; suggest them instead of doing them.

## Animations: GSAP only

- Every animation asked for is done with [GSAP](https://gsap.com/docs/v3/) —
  no CSS `@keyframes`/transition-based animations, Web Animations API or other
  animation libraries. The CSS animations already in the site (the loader's
  spinner, `moveUpDown`, the theme's transitions) stay as they are unless a
  change to them is asked for.
- Install it from npm (`vp add gsap`) so it is bundled into the site's own
  assets: never from a CDN (no third-party scripts, see Security).
- Animate only what was asked, the way it was asked: no extra effects,
  durations, easings or elements of your own.
- Run GSAP in the browser only: create tweens in `onMounted` inside a
  `gsap.context()` scoped to the component, and `revert()` it in
  `onBeforeUnmount`, so nothing keeps running after the component goes.
