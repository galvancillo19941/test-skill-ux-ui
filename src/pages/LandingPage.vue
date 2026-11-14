<script setup lang="ts">
/**
 * The landing page ("/", in every language): the language menu (top-right) +
 * centered hero (logo, eyebrow, headline, copy) + the entry form + the legal
 * summary, in one column. Prerendered at build time in the base language and
 * hydrated (or redrawn in another language, see main.ts) in the browser.
 *
 * When the form reports a successful submission (the bubbling `entry-submitted`
 * DOM event from UniversalFormV1 — only sent when the API answered OK, never on
 * an error) and `thankYou.titleHtml` is set, the hero shows the thank-you copy
 * and the form is hidden. When the API refuses the entry (the bubbling
 * `entry-failed` DOM event, `{ message }`) the same thank-you screen shows,
 * with the form's message (plain text) as its headline in place of the
 * thank-you copy: the text `form.universalV1.shownErrors` gives for the
 * response's message, otherwise `messages.error`.
 *
 * Before the campaign opens and after it closes (the bubbling `campaign-phase`
 * DOM event, `{ phase, message }`) the same thank-you screen shows the
 * campaign's message from Probability, as is, with `data-phase` ("upcoming" or
 * "closed") on `.hero-form`; the legal summary stays under it. When the
 * campaign opens the landing copy and the form come back. Until the first
 * phase comes (`is-pending`) the headline and copy are hidden: only the logo,
 * the eyebrow and the loader show, so no copy flashes before a notice. They
 * stay in the HTML (prerender, crawlers), just not displayed.
 *
 * The page's motion lives in its components (NeonFrame, HeroIntro,
 * LanguageSwitcher, the form, LegalSummary), all GSAP: see src/site/motion.ts.
 *
 * `.site` wraps `.hero-form` (never on the same element): content/theme.css
 * styles it as `.site .hero-form …`.
 */
import { computed, ref, watch } from "vue";
import EntryForm from "../components/EntryForm.vue";
import HeroIntro from "../components/HeroIntro.vue";
import LanguageSwitcher from "../components/LanguageSwitcher.vue";
import LegalSummary from "../components/LegalSummary.vue";
import NeonFrame from "../components/NeonFrame.vue";
import { useSite } from "../site/site.ts";

const { config } = useSite();

const scroller = ref<HTMLElement | null>(null);
const submitted = ref(false);
/** The API's error message when it refused the entry. */
const failure = ref("");

type Notice = { phase: "upcoming" | "closed"; message: string };
const notice = ref<Notice | null>(null);
/** No phase yet: the form waits for the campaign's dates (none to wait for without `formFieldsUrl`). */
const pending = ref(Boolean(config.form.universalV1.formFieldsUrl));

const thanked = computed(
  () => (submitted.value && Boolean(config.thankYou.titleHtml)) || Boolean(failure.value),
);
const noticed = computed(() => (thanked.value ? null : notice.value));
const intro = computed(() =>
  failure.value
    ? { titleHtml: "", paragraphsHtml: [] }
    : thanked.value
      ? config.thankYou
      : noticed.value
        ? { titleHtml: "", paragraphsHtml: [] }
        : config.hero,
);

function onCampaignPhase(event: Event) {
  const detail = (event as CustomEvent<{ phase: string; message: string }>).detail;
  pending.value = false;
  notice.value = detail.phase === "open" ? null : (detail as Notice);
}

function onEntryFailed(event: Event) {
  failure.value = (event as CustomEvent<{ message: string }>).detail.message;
}

watch([thanked, noticed], ([isThanked, isNoticed]) => {
  if (isThanked || isNoticed) scroller.value?.scrollTo({ top: 0 });
});
</script>

<template>
  <div class="site landing">
    <div
      ref="scroller"
      class="hero-form invisible-scrollbars"
      :class="{ 'is-thanked': thanked || noticed, 'is-pending': pending }"
      :data-phase="noticed?.phase"
    >
      <NeonFrame>
        <LanguageSwitcher />
        <main class="hero-form__content">
          <HeroIntro
            :eyebrow="config.hero.eyebrow"
            :title-html="intro.titleHtml"
            :title="failure || noticed?.message"
            :paragraphs-html="intro.paragraphsHtml"
            animated
            :revealed="!pending"
          />
          <!-- Held (not display:none: v1 measures its width) while the campaign isn't open. -->
          <div
            v-show="!thanked"
            class="hero-form__form"
            :class="{ 'is-held': noticed }"
            @entry-submitted="submitted = true"
            @entry-failed="onEntryFailed"
            @campaign-phase="onCampaignPhase"
          >
            <EntryForm />
          </div>
          <LegalSummary />
        </main>
      </NeonFrame>
    </div>
  </div>
</template>

<style scoped>
.landing {
  width: 100%;
  height: 100%;
}

.hero-form {
  background-color: var(--bg-initial);
  width: 100%;
  height: 100%;
  overflow-y: auto;
}

.hero-form__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}

.hero-form__form {
  width: 100%;
}

.hero-form.is-pending :deep(.hero-intro__title),
.hero-form.is-pending :deep(.hero-intro__text) {
  display: none;
}

.hero-form__form.is-held {
  visibility: hidden;
  height: 0;
  margin: 0;
  overflow: hidden;
}
</style>
