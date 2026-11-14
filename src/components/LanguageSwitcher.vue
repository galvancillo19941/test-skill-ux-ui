<script setup lang="ts">
/**
 * Language menu, top-right on the page (Figma 3089:166): a button with the
 * current language's code that opens a listbox of every language, each named in
 * itself (`languageMenu.name`). Choosing one redraws the site in that language
 * in place (`switchLocale`, see main.ts): the URL never changes and the browser
 * remembers the pick for the next load. The redrawn menu takes the focus back. Drawn only when the site has
 * more than one language. Looks in content/theme.css.
 *
 * Keyboard (listbox pattern): ↓/↑/Enter/Space on the button open it on the
 * current language; in the list ↓/↑/Home/End move, Enter/Space choose, Escape
 * closes back to the button, Tab closes. A click outside closes it.
 *
 * Motion (GSAP, src/site/motion.ts): it drops in on load, after the hero, and
 * the list unfolds when it opens.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId } from "vue";
import { languages } from "../site/i18n.ts";
import { gsap, useMotion } from "../site/motion.ts";
import { config, useSite } from "../site/site.ts";

const site = useSite();
const options = languages(config);
const selected = Math.max(
  0,
  options.findIndex((o) => o.locale === site.locale),
);
const current = options[selected]!;
const label = site.config.languageMenu.label;

const id = useId();
const listId = `${id}-list`;
const optionId = (i: number) => `${id}-option-${i}`;

const root = ref<HTMLElement | null>(null);
const button = ref<HTMLButtonElement | null>(null);
const list = ref<HTMLElement | null>(null);
const open = ref(false);
const active = ref(selected);
const activeId = computed(() => (open.value ? optionId(active.value) : undefined));

// Redrawn by the language menu: already on screen, nothing to bring in.
const entrance = !site.fromMenu;
const { run } = useMotion(root, (root) => {
  if (entrance) {
    gsap.from(root, { autoAlpha: 0, y: -16, duration: 0.8, delay: 1, ease: "power3.out" });
  }
});

async function show() {
  active.value = selected;
  open.value = true;
  await nextTick();
  list.value?.focus();
  run(() =>
    gsap.fromTo(
      list.value,
      { autoAlpha: 0, y: -8, scaleY: 0.92, transformOrigin: "top center" },
      { autoAlpha: 1, y: 0, scaleY: 1, duration: 0.25, ease: "power2.out", clearProps: "all" },
    ),
  );
}

function hide(refocus = false) {
  open.value = false;
  if (refocus) button.value?.focus();
}

function choose(i: number) {
  const option = options[i]!;
  if (option.locale === site.locale) return hide(true);
  site.switchLocale?.(option.locale);
}

function onButtonKeydown(event: KeyboardEvent) {
  if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
    event.preventDefault();
    void show();
  }
}

function onListKeydown(event: KeyboardEvent) {
  const last = options.length - 1;
  const moves: Record<string, number> = {
    ArrowDown: Math.min(active.value + 1, last),
    ArrowUp: Math.max(active.value - 1, 0),
    Home: 0,
    End: last,
  };
  if (event.key in moves) {
    event.preventDefault();
    active.value = moves[event.key]!;
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    choose(active.value);
  } else if (event.key === "Escape") {
    event.preventDefault();
    hide(true);
  } else if (event.key === "Tab") {
    hide();
  }
}

function onOutside(event: PointerEvent) {
  if (open.value && !root.value?.contains(event.target as Node)) hide();
}

onMounted(() => {
  document.addEventListener("pointerdown", onOutside);
  if (site.fromMenu) button.value?.focus();
});
onBeforeUnmount(() => document.removeEventListener("pointerdown", onOutside));
</script>

<template>
  <div
    v-if="options.length > 1"
    ref="root"
    class="language-switcher"
    :class="{ 'is-open': open }"
    :data-motion="entrance || undefined"
  >
    <button
      ref="button"
      type="button"
      class="language-switcher__button"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      @click="open ? hide() : show()"
      @keydown="onButtonKeydown"
    >
      <span class="language-switcher__globe" aria-hidden="true"></span>
      <span class="sr-only">{{ label }}: </span>
      <span class="language-switcher__code" :lang="current.locale">{{ current.code }}</span>
      <span class="language-switcher__chevron" aria-hidden="true"></span>
    </button>
    <ul
      v-show="open"
      :id="listId"
      ref="list"
      class="language-switcher__menu"
      role="listbox"
      tabindex="-1"
      :aria-label="label"
      :aria-activedescendant="activeId"
      @keydown="onListKeydown"
    >
      <li
        v-for="(option, i) in options"
        :id="optionId(i)"
        :key="option.locale"
        class="language-switcher__option"
        :class="{ 'is-active': i === active }"
        role="option"
        :lang="option.locale"
        :aria-selected="option.locale === site.locale"
        @click="choose(i)"
        @pointermove="active = i"
      >
        {{ option.name }}
      </li>
    </ul>
  </div>
</template>
