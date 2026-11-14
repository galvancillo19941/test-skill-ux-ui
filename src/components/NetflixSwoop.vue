<script setup lang="ts">
/**
 * The Netflix logo swoop's drawing (netflixSwoop.ts), in `viewBox` (the
 * logo's): the wordmark (`wordmarkSrc`, at `stage`) under the mask it comes
 * in through, and the N — its three pieces at their starting shapes, the
 * diagonal over the legs with its soft dark shadow. Hidden until HeroIntro
 * plays it.
 */
import { useId } from "vue";
import { PIECES, WORDMARK_EDGE, type SwoopStage } from "./netflixSwoop.ts";

const props = defineProps<{ viewBox: string; wordmarkSrc: string; stage: SwoopStage }>();

const id = useId();
const shadow = `${id}-shadow`;
const edge = `${id}-edge`;
const mask = `${id}-mask`;
const wordmarkHeight = props.stage.n.height;
const edgeAt = (share: number) => props.stage.n.x + props.stage.wordmarkWidth * share;
</script>

<template>
  <svg class="netflix-swoop" :viewBox="viewBox" aria-hidden="true" focusable="false" data-motion>
    <defs>
      <filter :id="shadow" x="-50%" y="-50%" width="200%" height="200%">
        <feDropShadow dx="0" dy="0" stdDeviation="14" flood-color="#160002" flood-opacity="0.7" />
      </filter>
      <linearGradient
        :id="edge"
        gradientUnits="userSpaceOnUse"
        :x1="edgeAt(WORDMARK_EDGE.from)"
        :x2="edgeAt(WORDMARK_EDGE.to)"
        y1="0"
        y2="0"
      >
        <stop offset="0" stop-color="#fff" />
        <stop offset="1" stop-color="#000" />
      </linearGradient>
      <mask :id="mask" maskUnits="userSpaceOnUse" x="-2000" y="-2000" width="4000" height="4000">
        <rect x="-2000" y="-2000" width="4000" height="4000" :fill="`url(#${edge})`" />
      </mask>
    </defs>
    <g :mask="`url(#${mask})`">
      <g class="netflix-swoop__wordmark">
        <image
          :href="wordmarkSrc"
          :x="stage.n.x"
          :y="stage.n.y"
          :width="stage.wordmarkWidth"
          :height="wordmarkHeight"
        />
      </g>
    </g>
    <g class="netflix-swoop__n">
      <path data-piece="right" :d="PIECES.right.from" :fill="PIECES.right.fill" />
      <path data-piece="left" :d="PIECES.left.from" :fill="PIECES.left.fill" />
      <path
        data-piece="diagonal"
        :d="PIECES.diagonal.from"
        :fill="PIECES.diagonal.fill"
        :filter="`url(#${shadow})`"
      />
    </g>
  </svg>
</template>
