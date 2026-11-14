<script setup lang="ts">
/**
 * Centered hero: brand logo (config.header), optional eyebrow, headline and
 * paragraphs. The copy comes in as props so a layout can swap it (e.g. for the
 * thank-you message after submitting). `title`, when given, is a plain-text
 * headline used instead of `titleHtml` (text from an API, never drawn as HTML).
 * Visual styling lives in theme.css.
 *
 * `animated` (the landing; never the static error page, which has no
 * JavaScript): on load the logo's NETFLIX comes in with the Netflix logo
 * swoop (NetflixSwoop, netflixSwoop.ts) — the logo itself shows only the rest
 * meanwhile —; once it is in, the rest (STRANGER THINGS) fades in with a red
 * glow and the eyebrow closes in;
 * the headline and copy come in, staggered, once `revealed` and again each
 * time they change (the notices, the thanks). See src/site/motion.ts.
 */
import { ref, watch } from "vue";
import { gsap, useMotion } from "../site/motion.ts";
import { asset, useSite } from "../site/site.ts";
import NetflixSwoop from "./NetflixSwoop.vue";
import { swoopTimeline, type SwoopStage } from "./netflixSwoop.ts";

const props = defineProps<{
  eyebrow?: string;
  titleHtml: string;
  title?: string;
  paragraphsHtml?: string[];
  animated?: boolean;
  /** The headline and copy are on screen (the layout may hold them back). */
  revealed?: boolean;
}>();

const site = useSite();
const { config } = site;
// Redrawn by the language menu: already on screen, nothing to bring in.
const entrance = props.animated && !site.fromMenu;

const root = ref<HTMLElement | null>(null);

/**
 * The logo (content/img/lockup.svg) as the swoop sees it: its viewBox, its
 * NETFLIX wordmark (img/netflix-wordmark.svg) — the box of its N and its width —
 * and where the wordmark ends, as a share of the logo's height.
 */
const LOGO = { viewBox: "0 0 532 298", wordmark: "img/netflix-wordmark.svg", wordmarkEnd: 24 };
const STAGE: SwoopStage = {
  n: { x: 179.12, y: 5.27, width: 23.81, height: 46.7 },
  wordmarkWidth: 173.8,
};
/** Room left round the clipped logo for its glow. */
const GLOW_ROOM = "-80px";

function revealCopy(root: HTMLElement) {
  const copy = root.querySelectorAll(".hero-intro__title, .hero-intro__text");
  gsap.fromTo(
    copy,
    { autoAlpha: 0, y: 24, filter: "blur(8px)" },
    {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      duration: 0.9,
      stagger: 0.12,
      ease: "power3.out",
      clearProps: "filter,transform",
    },
  );
}

const { run } = useMotion(root, (root) => {
  if (!entrance) return;
  const logo = root.querySelector(".hero-intro__logo");
  const eyebrow = root.querySelector(".hero-intro__eyebrow");
  const swoop = root.querySelector<SVGSVGElement>(".netflix-swoop");
  const n = swoop?.querySelector<SVGGElement>(".netflix-swoop__n");
  const wordmark = swoop?.querySelector<SVGGElement>(".netflix-swoop__wordmark");
  const tl = gsap.timeline();
  // When the rest of the logo comes in: once NETFLIX is in.
  let rest = 0;
  if (swoop && n && wordmark) {
    const play = swoopTimeline(gsap, swoop, n, wordmark, STAGE);
    rest = play.settled;
    const end = rest + 1.7;
    // The logo shows all but its NETFLIX (the swoop's) until the end, when it takes over.
    tl.set(
      logo,
      { clipPath: `inset(${LOGO.wordmarkEnd}% ${GLOW_ROOM} ${GLOW_ROOM} ${GLOW_ROOM})` },
      0,
    )
      .add(play.timeline, 0)
      .set(logo, { clearProps: "clipPath" }, end)
      .set(swoop, { autoAlpha: 0 }, end);
  }
  tl.fromTo(
    logo,
    { autoAlpha: 0, scale: 0.94 },
    { autoAlpha: 1, scale: 1, duration: 1.6, ease: "power3.out" },
    rest,
  ).fromTo(
    logo,
    { filter: "drop-shadow(0 0 0px rgba(228, 0, 43, 0))" },
    {
      keyframes: [
        { filter: "drop-shadow(0 0 22px rgba(228, 0, 43, 0.85))", duration: 0.6 },
        { filter: "drop-shadow(0 0 0px rgba(228, 0, 43, 0))", duration: 1.2 },
      ],
      ease: "sine.inOut",
    },
    rest + 0.3,
  );
  // Done: the logo back to its own styles (no leftover glow or transform).
  tl.set(logo, { clearProps: "filter,transform" }, rest + 2.1);
  if (eyebrow) {
    tl.from(
      eyebrow,
      {
        autoAlpha: 0,
        letterSpacing: "18px",
        duration: 1.2,
        ease: "expo.out",
        clearProps: "letterSpacing",
      },
      rest + 0.55,
    );
  }
  if (props.revealed) tl.add(() => revealCopy(root), rest + 0.9);
});

watch(
  () => [props.revealed, props.title, props.titleHtml] as const,
  ([revealed]) => {
    if (props.animated && revealed) run(revealCopy);
  },
  { flush: "post" },
);
</script>

<template>
  <header ref="root" class="hero-intro">
    <div class="hero-intro__brand">
      <img
        class="hero-intro__logo"
        :src="asset(config.header.logo)"
        :alt="config.header.alt"
        :data-motion="entrance || undefined"
      />
      <NetflixSwoop
        v-if="entrance"
        :view-box="LOGO.viewBox"
        :wordmark-src="asset(LOGO.wordmark)"
        :stage="STAGE"
      />
    </div>
    <p v-if="eyebrow" class="hero-intro__eyebrow" :data-motion="entrance || undefined">
      {{ eyebrow }}
    </p>
    <h1 v-if="title" class="hero-intro__title">{{ title }}</h1>
    <!-- eslint-disable-next-line vue/no-v-html -- trusted site copy (content/config.json) -->
    <h1 v-else class="hero-intro__title" v-html="titleHtml"></h1>
    <!-- eslint-disable-next-line vue/no-v-html -- trusted site copy (content/config.json) -->
    <p v-for="(p, i) in paragraphsHtml" :key="i" class="hero-intro__text" v-html="p"></p>
  </header>
</template>

<style scoped>
.hero-intro {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.hero-intro__brand {
  position: relative;
  max-width: 100%;
}

.hero-intro__logo {
  display: block;
  max-width: 100%;
  height: auto;
}

/* The swoop, over the logo and the same size. */
.netflix-swoop {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.netflix-swoop {
  overflow: visible;
}

.hero-intro p,
.hero-intro h1 {
  margin: 0;
}
</style>
