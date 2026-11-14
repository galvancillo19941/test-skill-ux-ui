<script setup lang="ts">
/** The legal copy under the form. It rises in on load, after the hero (GSAP, src/site/motion.ts). */
import { ref } from "vue";
import { gsap, useMotion } from "../site/motion.ts";
import { useSite } from "../site/site.ts";

const site = useSite();
const { config } = site;

const root = ref<HTMLElement | null>(null);
// Redrawn by the language menu: already on screen, nothing to bring in.
const entrance = !site.fromMenu;
useMotion(root, (root) => {
  if (entrance) {
    gsap.from(root, { autoAlpha: 0, y: 16, duration: 0.9, delay: 1.2, ease: "power3.out" });
  }
});
</script>

<template>
  <section ref="root" class="abrules-component" :data-motion="entrance || undefined">
    <p class="abrules-component__disclaimer">{{ config.legal.personalizationDisclaimer }}</p>
    <br />
    <!-- eslint-disable-next-line vue/no-v-html -- trusted site copy (content/config.json) -->
    <p v-html="config.legal.summaryHtml"></p>
  </section>
</template>

<style scoped>
.abrules-component {
  padding: 1rem 0;
  text-align: center;
}

.abrules-component__disclaimer {
  font-size: 7px;
}

.abrules-component p {
  font-size: 9px;
  font-weight: 400;
  line-height: 1.6;
  color: var(--ink-muted);
  letter-spacing: 0.09px;
  margin: 0;
}

.abrules-component :deep(a) {
  color: var(--ink-muted);
  text-decoration: underline;
}
</style>
