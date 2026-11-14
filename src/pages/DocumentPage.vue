<script setup lang="ts">
/**
 * A document's page (config.documents, at its own path, e.g. /termsofuse): the
 * PDF shown right in the page, nothing else. Blank until the document has its
 * PDF. Prerendered (scripts/prerender.ts) and drawn in the browser by
 * src/document.ts.
 */
import PdfViewer from "../components/PdfViewer.vue";
import type { SiteDocument } from "../site/documents.ts";
import { asset } from "../site/site.ts";

defineProps<{ doc: SiteDocument }>();
</script>

<template>
  <PdfViewer v-if="doc.file" :src="asset(doc.file)" :title="doc.title" />
</template>

<style>
html,
body {
  margin: 0;
}
</style>
