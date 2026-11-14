<script setup lang="ts">
/**
 * The page's red neon frame (`.hero-form__frame`, looks in theme.css) around
 * its content. Every now and then the line lights up a little, like a neon
 * tube: an extra halo (`.neon-frame__glow`, only its opacity moves) flickers
 * softly and goes out again. Off the rest of the time. And now and then a
 * red spark runs fast along the whole line, glowing like the logo does on
 * load (`.neon-frame__spark`: SVG strokes over the border — a bright head and
 * a trail that fades behind it — moved by their dash offset). See
 * src/site/motion.ts.
 */
import { ref } from "vue";
import { gsap, useMotion } from "../site/motion.ts";

const frame = ref<HTMLElement | null>(null);

/** One 6 s cycle, repeated: two different glows at uneven times, so it doesn't feel like a beat. */
const CYCLE_S = 6;

/** The spark: one lap's time and the pause between laps (s). */
const SPARK = { lap: 2.2, every: 7 };
/** Its strokes, head first: each ends at the spark's head and reaches this far back (px). */
const STROKES = [
  { part: "head", length: 60 },
  { part: "trail", length: 160 },
  { part: "tail", length: 340 },
] as const;
/** The spark's strokes measure the frame's outline in these units (`pathLength`), whatever its size. */
const PATH = 1000;

useMotion(frame, (frame) => {
  const glow = frame.querySelector(".neon-frame__glow");
  gsap
    .timeline({ delay: 0.5, repeat: -1 })
    .set(glow, { autoAlpha: 0 }, 0)
    // A short, soft flicker…
    .to(
      glow,
      {
        keyframes: [
          { autoAlpha: 0.45, duration: 0.12 },
          { autoAlpha: 0.1, duration: 0.1 },
          { autoAlpha: 0.5, duration: 0.15 },
          { autoAlpha: 0, duration: 0.9, ease: "sine.out" },
        ],
        ease: "none",
      },
      0.8,
    )
    // …and later a single slow glow.
    .to(
      glow,
      {
        keyframes: [
          { autoAlpha: 0.35, duration: 0.6, ease: "sine.inOut" },
          { autoAlpha: 0, duration: 1, ease: "sine.inOut" },
        ],
      },
      3.6,
    )
    .set({}, {}, CYCLE_S);

  // The spark: `head` runs once round the outline; core and trail end at it.
  const spark = frame.querySelector<SVGSVGElement>(".neon-frame__spark");
  if (!spark) return;
  const strokes = STROKES.map((stroke) => ({
    rect: spark.querySelector<SVGRectElement>(`.neon-frame__spark-${stroke.part}`)!,
    px: stroke.length,
    length: 0,
  }));
  const lap = { head: 0 };
  let longest = 0;
  const measure = () => {
    // The strokes sit on the border's middle: its radius less half the border.
    const rx = String(Math.max(0, parseFloat(getComputedStyle(frame).borderTopLeftRadius) - 1));
    const { width, height } = frame.getBoundingClientRect();
    const perimeter = 2 * (width + height) || 1;
    for (const stroke of strokes) {
      stroke.length = (stroke.px / perimeter) * PATH;
      stroke.rect.setAttribute("rx", rx);
      stroke.rect.style.strokeDasharray = `${stroke.length} ${PATH + stroke.length}`;
    }
    longest = Math.max(...strokes.map((stroke) => stroke.length));
  };
  const draw = () => {
    for (const stroke of strokes) {
      stroke.rect.style.strokeDashoffset = String(stroke.length - lap.head);
    }
  };
  gsap
    .timeline({ delay: 1.6, repeat: -1, repeatDelay: SPARK.every, repeatRefresh: true })
    .call(measure)
    .fromTo(
      lap,
      { head: 0 },
      { head: () => PATH + longest, duration: SPARK.lap, ease: "sine.inOut", onUpdate: draw },
      0,
    )
    .fromTo(spark, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.25, ease: "power1.out" }, 0)
    .to(spark, { autoAlpha: 0, duration: 0.4, ease: "power1.in" }, SPARK.lap - 0.4);
});
</script>

<template>
  <div ref="frame" class="hero-form__frame">
    <span class="neon-frame__glow" aria-hidden="true"></span>
    <svg class="neon-frame__spark" aria-hidden="true" focusable="false">
      <rect
        v-for="stroke in [...STROKES].reverse()"
        :key="stroke.part"
        :class="`neon-frame__spark-${stroke.part}`"
        width="100%"
        height="100%"
        :pathLength="PATH"
      />
    </svg>
    <slot />
  </div>
</template>
