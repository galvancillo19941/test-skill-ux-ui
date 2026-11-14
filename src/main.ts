import { createApp, createSSRApp } from "vue";
import LandingPage from "./pages/LandingPage.vue";
import "./site/site.ts"; // validates content/config.json and loads content/theme.css
import "./style.css";

// Builds prerender the page into #app (scripts/prerender.ts): hydrate it.
// `vp dev` serves an empty #app: render from scratch.
const hydrate = document.getElementById("app")?.hasChildNodes();
(hydrate ? createSSRApp : createApp)(LandingPage).mount("#app");
