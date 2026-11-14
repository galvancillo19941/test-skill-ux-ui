<script setup lang="ts">
/**
 * The entry block: optional intro copy above Probability's Universal Form v1
 * (fields from config.json, the page submits the entry).
 */
import { useSite } from "../site/site.ts";
import UniversalFormV1 from "./universal-form-v1/UniversalFormV1.vue";

const form = useSite().config.form;
</script>

<template>
  <section class="gallery-form">
    <div v-if="form.intro.title || form.intro.description" class="form-intro">
      <h2 v-if="form.intro.title" class="form-intro__title">{{ form.intro.title }}</h2>
      <p v-if="form.intro.description" class="form-intro__description">
        {{ form.intro.description }}
      </p>
    </div>

    <UniversalFormV1 />
  </section>
</template>

<style scoped>
.gallery-form {
  width: 100%;
  margin-top: 40px;
}

.form-intro {
  text-align: center;
  width: calc(100% - 40px);
  max-width: 544px;
  margin: 0 auto;
}

.form-intro__title {
  font-weight: 700;
  font-size: 18px;
  color: var(--oneid-label-color);
  margin: 0 0 8px;
}

@media (min-width: 768px) {
  .form-intro__title {
    font-size: 20px;
  }
}

.form-intro__description {
  font-size: 12px;
  color: var(--oneid-label-color);
  font-weight: 400;
  margin: 0 0 1rem;
  line-height: 1.4;
}

@media (min-width: 768px) {
  .form-intro__description {
    font-size: 14px;
  }
}
</style>
