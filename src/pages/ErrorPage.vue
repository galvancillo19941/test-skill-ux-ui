<script setup lang="ts">
/**
 * The custom error page, prerendered to error.html: S3 serves it for any path
 * that doesn't exist. Static (no JavaScript), so its styles live in
 * content/theme.css (the client bundle never imports this component).
 */
import HeroIntro from "../components/HeroIntro.vue";
import { useSite } from "../site/site.ts";

const page = useSite().config.errorPage;
</script>

<template>
  <div class="site error-site invisible-scrollbars">
    <div class="hero-form__frame">
      <main class="hero-form__content error-page">
        <HeroIntro :title-html="page.title" :paragraphs-html="[]" />
        <p class="hero-intro__text error-page__message">{{ page.message }}</p>
        <a class="error-page__link" href="/">{{ page.linkLabel }}</a>
      </main>
    </div>
  </div>
</template>
