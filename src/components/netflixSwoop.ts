import type { gsap as Gsap } from "gsap";

/**
 * The Netflix logo swoop (LottieFiles "Netflix Logo Swoop", redone with GSAP:
 * see AGENTS.md), as the original plays it:
 *
 *   1. a big N is drawn stroke by stroke — right leg, diagonal, left leg — and
 *      shrinks where it is to the size of a letter, at the wordmark's centre;
 *   2. the N slides left onto the wordmark's N while the wordmark slides in
 *      with it from the right, its letters coming out of a soft edge (a
 *      blurred mask) as it fades in; the N fades away on the wordmark's.
 *
 * The N's shapes are the animation's own, in its coordinates (centred on 0,
 * 437 tall), as SVG paths of the same structure in every state so GSAP can
 * tween their `d`. Times are the animation's frames at 30 fps.
 */

/** Each piece: its colour and its path drawn from nothing, whole, and as the wordmark's N. */
export const PIECES = {
  right: {
    fill: "#b1060f",
    from: "M34.1 -359.12C34.1 -359.12 120.29 -359.43 120.29 -359.43C120.29 -359.43 120.49 -359.89 120.49 -359.89C119.59 -359.89 34.36 -359.12 33.16 -359.12C33.16 -359.12 34.1 -359.12 34.1 -359.12Z",
    whole:
      "M34.13 -218.21C34.13 -218.21 120.32 -218.52 120.32 -218.52C120.32 -218.52 120.32 218.52 120.32 218.52C91.64 214.92 62.8 212.21 34.13 211.34C34.13 211.34 34.13 -218.21 34.13 -218.21Z",
    wordmark:
      "M48.41 -218.71C48.41 -218.71 114.36 -217.97 114.36 -217.97C114.36 -217.97 116.87 194.04 116.87 194.04C89.32 195.38 72.66 196.57 44.41 201.1C44.41 201.1 48.41 -218.71 48.41 -218.71Z",
  },
  left: {
    fill: "#b1060f",
    from: "M-34.13 -218.21C-34.13 -218.21 -120.32 -218.52 -120.32 -218.52C-120.32 -218.52 -120.72 -218.98 -120.72 -218.98C-94.43 -218.26 -34.7 -217.5 -34.7 -218.59C-34.7 -218.59 -34.13 -218.21 -34.13 -218.21Z",
    whole:
      "M-34.13 -218.21C-34.13 -218.21 -120.32 -218.52 -120.32 -218.52C-120.32 -218.52 -120.32 218.52 -120.32 218.52C-91.64 214.92 -62.8 212.21 -34.13 211.34C-34.13 211.34 -34.13 -218.21 -34.13 -218.21Z",
    wordmark:
      "M-43.65 -218.74C-43.65 -218.74 -106.03 -218.14 -106.03 -218.14C-106.03 -218.14 -106.03 217.33 -106.03 217.33C-77.36 213.73 -66.46 210.86 -37.7 211.82C-37.7 211.82 -43.65 -218.74 -43.65 -218.74Z",
  },
  diagonal: {
    fill: "#e50914",
    from: "M120.61 218.72C120.61 218.72 31.8 211.53 31.8 211.53C31.8 211.53 31.98 211.21 31.98 211.21C74.66 212.29 120.32 218.5 120.32 218.5C120.32 218.5 120.61 218.72 120.61 218.72Z",
    whole:
      "M-34.13 -218.21C-34.13 -218.21 -119.9 -218.21 -119.9 -218.21C-119.9 -218.21 31.98 211.21 31.98 211.21C74.66 212.29 120.32 218.5 120.32 218.5C120.32 218.5 -34.13 -218.21 -34.13 -218.21Z",
    wordmark:
      "M-47.22 -218.71C-47.22 -218.71 -102.04 -218.71 -102.04 -218.71C-102.04 -218.71 41.5 198.12 41.5 198.12C85.92 191.81 102.46 192.8 102.46 192.8C102.46 192.8 -47.22 -218.71 -47.22 -218.71Z",
  },
} as const;

export type PieceName = keyof typeof PIECES;

/** Height of the N in the animation's units. */
const N_HEIGHT = 437;
/** Centre of the N as the wordmark's (its `wordmark` paths), in the animation's units. */
const N_WORDMARK_CENTRE = { x: 5.4, y: -0.7 };

const s = (frame: number) => frame / 30;

/**
 * Where the swoop happens, in the coordinates of the SVG it is drawn in: the
 * box of the wordmark's N (where the N lands) and the wordmark's width.
 */
export interface SwoopStage {
  n: { x: number; y: number; width: number; height: number };
  wordmarkWidth: number;
}

/**
 * The N's height drawn big, in letter heights (the original goes 66% → 21%,
 * ×3.1; here a bit less, so that above the logo it keeps clear of the frame).
 */
const BIG = 2.4;

/**
 * The soft edge the wordmark's letters come out of while it slides in: where
 * its mask starts and ends fading, from the wordmark's left, in wordmark widths
 * (the original's blurred matte, just past the wordmark's right end).
 */
export const WORDMARK_EDGE = { from: 1, to: 1.4 };

/**
 * The swoop's timeline: `n` (the `<g>` of the pieces, by their `data-piece`)
 * and `wordmark` (a `<g>` drawn at its place, under its mask) in `svg`. It ends
 * with the wordmark whole and the N gone, ~2.8 s in; `settled` (s) is when the
 * wordmark has arrived.
 */
export function swoopTimeline(
  gsap: typeof Gsap,
  svg: SVGSVGElement,
  n: SVGGElement,
  wordmark: SVGGElement,
  stage: SwoopStage,
): { timeline: gsap.core.Timeline; settled: number } {
  const piece = (name: PieceName) => n.querySelector(`[data-piece="${name}"]`);
  const small = stage.n.height / N_HEIGHT;
  // Where the N lands (its centre as the wordmark's N) and where it is drawn: the wordmark's centre.
  const landed = {
    x: stage.n.x + stage.n.width / 2 - N_WORDMARK_CENTRE.x * small,
    y: stage.n.y + stage.n.height / 2 - N_WORDMARK_CENTRE.y * small,
  };
  const drawnAt = stage.n.x + stage.wordmarkWidth / 2;
  const slide = drawnAt - landed.x;
  const tl = gsap.timeline();
  tl.set(svg, { autoAlpha: 1 }, 0)
    .set(n, { x: drawnAt, y: landed.y, scale: small * BIG, svgOrigin: "0 0" }, 0)
    .set(wordmark, { x: slide, autoAlpha: 0 }, 0)
    // 1. Drawn stroke by stroke…
    .fromTo(
      piece("right"),
      { attr: { d: PIECES.right.from } },
      { attr: { d: PIECES.right.whole }, duration: s(12), ease: "power2.inOut" },
      0,
    )
    .fromTo(
      piece("diagonal"),
      { attr: { d: PIECES.diagonal.from } },
      { attr: { d: PIECES.diagonal.whole }, duration: s(14), ease: "power2.inOut" },
      s(9),
    )
    .fromTo(
      piece("left"),
      { attr: { d: PIECES.left.from } },
      { attr: { d: PIECES.left.whole }, duration: s(11), ease: "power2.inOut" },
      s(19),
    )
    // …and shrunk where it is to a letter.
    .to(n, { scale: small, duration: s(29), ease: "power3.inOut" }, s(23))
    // 2. The N and the wordmark slide left together…
    .to(n, { x: landed.x, duration: s(25.4), ease: "power3.inOut" }, s(52))
    .to(wordmark, { x: 0, duration: s(25.4), ease: "power3.inOut" }, s(52))
    // …the wordmark fading in, the N taking its N's shape and fading away on it.
    .to(wordmark, { autoAlpha: 1, duration: s(23), ease: "power2.inOut" }, s(52))
    .to(n, { autoAlpha: 0, duration: s(26), ease: "power2.in" }, s(57));
  for (const name of Object.keys(PIECES) as PieceName[]) {
    tl.to(
      piece(name),
      { attr: { d: PIECES[name].wordmark }, duration: s(16), ease: "power2.inOut" },
      s(62),
    );
  }
  return { timeline: tl, settled: s(77.4) };
}
