import { createApp, createSSRApp } from "vue";
import DocumentPage from "./pages/DocumentPage.vue";
import { documentAt } from "./site/documents.ts";
import { config, siteKey } from "./site/site.ts";

// Client entry of the documents' pages (config.documents, e.g. /termsofuse),
// built from document.html: which document it is comes from the path. Builds
// prerender the page into #app (scripts/prerender.ts) and this hydrates it;
// `vp dev` serves an empty #app, drawn from scratch.
const doc = documentAt(config.documents, location.pathname);
if (doc) {
  const hydrate = document.getElementById("app")?.hasChildNodes();
  const app = (hydrate ? createSSRApp : createApp)(DocumentPage, { doc });
  app.provide(siteKey, { locale: doc.lang, config });
  app.mount("#app");
}
