<script setup lang="ts">
/**
 * A PDF shown in the page, page after page, at the viewer's width. Drawn with
 * PDF.js (pdfjs-dist: the library and its worker are build assets of this site,
 * no third party) because a browser can't be trusted to show a PDF in a page by
 * itself: Android's Chrome shows nothing in an <iframe>. Each page is a canvas
 * (sharp at the screen's pixel ratio) with the PDF's web links on top, where
 * they are on the page. The library loads only in the browser (onMounted); if
 * the PDF can't be drawn, a link to it shows instead.
 */
// Bundled as a .js worker: some servers (nginx) send .mjs as application/octet-stream,
// which the browser refuses to run.
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?worker&url";
import { onBeforeUnmount, onMounted, ref } from "vue";

const props = defineProps<{ src: string; title: string }>();

const pagesEl = ref<HTMLElement | null>(null);
const failed = ref(false);
let cancel: (() => void) | undefined;

const SAFE_LINK = /^(https?|mailto):/i;
const percent = (part: number, whole: number) => `${(part / whole) * 100}%`;

onMounted(async () => {
  try {
    const pdfjs = await import("pdfjs-dist");
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const task = pdfjs.getDocument({ url: props.src });
    cancel = () => void task.destroy();
    const pdf = await task.promise;
    const host = pagesEl.value!;
    const width = host.clientWidth;
    const ratio = window.devicePixelRatio || 1;

    for (let n = 1; n <= pdf.numPages; n++) {
      const page = await pdf.getPage(n);
      const viewport = page.getViewport({ scale: width / page.getViewport({ scale: 1 }).width });

      const box = document.createElement("div");
      box.className = "pdf-viewer__page";
      box.style.aspectRatio = `${viewport.width} / ${viewport.height}`;
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.setAttribute("role", "img");
      canvas.setAttribute("aria-label", `${props.title} — ${n} / ${pdf.numPages}`);
      box.append(canvas);

      for (const note of await page.getAnnotations()) {
        if (note.subtype !== "Link" || !SAFE_LINK.test(note.url ?? "")) continue;
        const [x1, y1] = viewport.convertToViewportPoint(note.rect[0], note.rect[1]);
        const [x2, y2] = viewport.convertToViewportPoint(note.rect[2], note.rect[3]);
        const link = document.createElement("a");
        link.href = note.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", note.url);
        Object.assign(link.style, {
          left: percent(Math.min(x1, x2), viewport.width),
          top: percent(Math.min(y1, y2), viewport.height),
          width: percent(Math.abs(x2 - x1), viewport.width),
          height: percent(Math.abs(y2 - y1), viewport.height),
        });
        box.append(link);
      }

      host.append(box);
      await page.render({
        canvas,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      }).promise;
    }
  } catch {
    failed.value = true;
  }
});

onBeforeUnmount(() => cancel?.());
</script>

<template>
  <main class="pdf-viewer" :aria-label="title">
    <div ref="pagesEl" class="pdf-viewer__pages"></div>
    <p v-if="failed" class="pdf-viewer__fallback">
      <a :href="src" target="_blank" rel="noopener noreferrer">{{ title }} (PDF)</a>
    </p>
  </main>
</template>

<style scoped>
.pdf-viewer {
  box-sizing: border-box;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 16px 12px;
  background: #525659;
}

.pdf-viewer__pages {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: 900px;
  margin: 0 auto;
}

.pdf-viewer__pages :deep(.pdf-viewer__page) {
  position: relative;
  width: 100%;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
}

.pdf-viewer__pages :deep(canvas) {
  display: block;
  width: 100%;
  height: 100%;
}

.pdf-viewer__pages :deep(a) {
  position: absolute;
}

.pdf-viewer__fallback {
  margin: 0;
  text-align: center;
  font:
    16px/1.5 system-ui,
    sans-serif;
}

.pdf-viewer__fallback a {
  color: #fff;
}
</style>
