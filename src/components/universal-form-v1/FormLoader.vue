<script setup lang="ts">
/**
 * Page loader shown in place of the whole form block until every form is
 * rendered, or an error with a retry button if it couldn't be. Texts come in as
 * props (config.json); looks are the project's theme.css
 * (`.form-loader`, `.form-loader__spinner`, `.form-loader__retry`).
 */
defineProps<{
  state: "loading" | "error";
  loadingText: string;
  errorText: string;
  retryText: string;
}>();
defineEmits<{ retry: [] }>();
</script>

<template>
  <div class="form-loader" :class="`is-${state}`">
    <div v-if="state === 'loading'" role="status" aria-live="polite" class="form-loader__body">
      <span class="form-loader__spinner" aria-hidden="true"></span>
      <span class="form-loader__text">{{ loadingText }}</span>
    </div>
    <div v-else role="alert" class="form-loader__body">
      <span class="form-loader__text">{{ errorText }}</span>
      <button type="button" class="form-loader__retry" @click="$emit('retry')">
        {{ retryText }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.form-loader {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 420px;
}

.form-loader__body {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}
</style>
