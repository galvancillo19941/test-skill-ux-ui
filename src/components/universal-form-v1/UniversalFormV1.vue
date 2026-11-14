<script setup lang="ts">
/**
 * Probability Universal Form v1 WITHOUT a campaign: no `program`, no `send`, so
 * the form stores nothing and the page POSTs the entry itself to
 * `form.universalV1.submitUrl` (with the `devForm` token asked for on mount from
 * `formFieldsUrl` — see useEntrySubmission.ts). The submit URL and the `env`
 * attribute come from the environment this build targets (site.ts).
 *
 * Two modes:
 *  - no `sections`: one `<universal-form config env>` that draws its own submit
 *    button; its `uf-submit` is what gets sent.
 *  - `sections`: one `<universal-form>` per section (a single step with
 *    `hideNav`, so v1 draws no buttons), the section title in v1's
 *    `slot-step="1"`, and ONE submit button drawn by this component. Pressing it
 *    validates every section (all errors show), focuses the first field in
 *    error, and — only if all pass — sends ONE POST (see sectionedForm.ts).
 *
 * Fields with `dependsOn` follow another field across sections (see
 * dependentFields.ts): on every change of a source field each form gets its
 * fields re-resolved, stale values are cleared and disabled fields go `inert`.
 * Fields with `validate` are checked by the page (see fieldRules.ts) as they are
 * typed, like v1 checks an email: the rule's message shows under the field, like
 * a v1 error, while the value doesn't match and goes once it does. On submit they
 * are checked together with v1's own validation, so every error shows at once;
 * a broken one stops the send and takes the focus. A rule's `inputMode` picks
 * the phone keyboard and its `maxLength` caps what can be typed. Fields with `noteHtml` get that notice under them, below
 * their error, redrawn after every render of v1. Site links in a `labelHtml`
 * (`/rules`) are made absolute first, or v1 would drop them (labelLinks.ts).
 *
 * While sending, the button is disabled and shows `messages.sending`; on success
 * the root dispatches a bubbling `entry-submitted` DOM event for the layout and
 * the button stays locked; on failure a bubbling `entry-failed` DOM event
 * (`{ message }`: the text `shownErrors` gives for the service's `error.detail`,
 * otherwise `messages.error`) for the layout to show it, and an alert under
 * the form.
 *
 * Opening and closing (campaignDates.ts): with `formFieldsUrl` the campaign's
 * dates come in the get-form-fields answer asked for on mount (the same request
 * as the devForm token), in parallel with the form, and only the loader
 * shows until they come — forever if they can't be had (the form never opens by
 * default). Before opening and after closing the form stays hidden and the root
 * dispatches a bubbling `campaign-phase` DOM event (`{ phase, message }`, also on
 * each later change) for the layout to show the message — "open" only once the
 * form is on screen, so the layout's copy comes with it; the phase is checked
 * every second, so the form opens and closes by itself. Once an entry is being
 * sent or its answer is on screen (thanks or error), the phase no longer changes.
 *
 * The v1 bundle is loaded once as `<script type="module">` in <head> — never
 * installed or copied into the repo.
 */
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { gsap, useMotion } from "../../site/motion.ts";
import { env, environment, useSite } from "../../site/site.ts";
import FormLoader from "./FormLoader.vue";
import {
  campaignClock,
  phaseMessage,
  watchCampaignPhase,
  type CampaignPhase,
} from "./campaignDates.ts";
import { dependencySources, resolveFields, withoutHidden } from "./dependentFields.ts";
import { ruleErrors, type RuleError } from "./fieldRules.ts";
import { applyFieldStyles, supportsBaseSelect, withStyledSelects } from "./fieldStyles.ts";
import { withAbsoluteLinks } from "./labelLinks.ts";
import { awaitReady, nextLoadState, type LoadEvent, type LoadState } from "./loadState.ts";
import {
  fieldOrder,
  pageMetadata,
  sectionConfig,
  submitSections,
  collectValues,
  type SectionForm,
} from "./sectionedForm.ts";
import {
  buildSubmissionPayload,
  ensureModuleScript,
  refusalMessage,
  useEntrySubmission,
} from "./useEntrySubmission.ts";

type FormEl = HTMLElement &
  Partial<SectionForm> & {
    config?: unknown;
    updateComplete?: Promise<unknown>;
    submit?: () => boolean;
    setValue?: (name: string, value: unknown) => void;
  };

const SCRIPT_ID = "universal-form-v1-script";

// In the page's language (its `config.locale` picks v1's own dictionary).
const site = useSite();
const v1 = site.config.form.universalV1;
const sections = v1.sections;

const root = ref<HTMLElement | null>(null);
const formsHost = ref<HTMLElement | null>(null);
const forms: FormEl[] = [];

const { state, errorDetail, prepare, submit, campaignDates, cancel } = useEntrySubmission({
  submitUrl: environment.submitUrl,
  formFieldsUrl: v1.formFieldsUrl,
  env,
});
const errorText = computed(() =>
  state.value === "error"
    ? refusalMessage(errorDetail.value, v1.shownErrors, v1.messages.error)
    : "",
);

// ── Page-side rules (`validate`) ──
/** Marks the errors the page draws (v1's own are plain `.field-required-error`). */
const RULE_ERROR_CLASS = "field-rule-error";

const wrapperName = (wrapper: Element | null) =>
  wrapper?.firstElementChild?.getAttribute("name") ?? "";

/** The wrapper of the field `name` (by name: v1 reuses wrappers by position). */
function fieldWrapper(name: string): Element | undefined {
  for (const form of forms) {
    for (const wrapper of form.querySelectorAll(".field-wrapper")) {
      if (wrapperName(wrapper) === name) return wrapper;
    }
  }
  return undefined;
}

/** Removes the rule error drawn under the field `name`, or every one. */
function clearRuleErrors(name?: string) {
  for (const form of forms) {
    for (const note of form.querySelectorAll(`.${RULE_ERROR_CLASS}`)) {
      if (!name || wrapperName(note.parentElement) === name) note.remove();
    }
  }
}

/**
 * Draws `errors` (after removing the rule error of the field `name`, or every
 * one): the rule's message under its field with v1's error class, so the theme
 * paints the field in error as for a required one.
 */
function showRuleErrors(errors: RuleError[], name?: string) {
  clearRuleErrors(name);
  for (const error of errors) {
    const note = document.createElement("div");
    note.className = `field-required-error ${RULE_ERROR_CLASS}`;
    note.textContent = error.message;
    fieldWrapper(error.name)?.append(note);
  }
}

/** The rule of the field `name` against the value being typed: its error comes and goes. */
function checkRule(name: string, value: unknown) {
  const field = v1.config.fields.filter((f) => f.name === name && f.validate);
  if (field.length > 0) showRuleErrors(ruleErrors(field, { [name]: value }), name);
}

/** Checks every `validate` rule; true when the entry may be sent. The first broken field takes the focus. */
function passesRules(values: Record<string, unknown>): boolean {
  const errors = ruleErrors(v1.config.fields, values);
  showRuleErrors(errors);
  if (errors.length > 0) void focusFirstError();
  return errors.length === 0;
}

// Sectioned mode: the page's own button. `busy` covers the async gap between
// the click and `state` turning to "sending", so a double click can't send twice.
const busy = ref(false);
const locked = computed(() => busy.value || state.value === "sending" || state.value === "sent");
const buttonLabel = computed(() =>
  locked.value && state.value !== "sent"
    ? v1.messages.sending
    : (v1.config.submit?.label ?? "Submit"),
);

function announceSent() {
  root.value?.dispatchEvent(new CustomEvent("entry-submitted", { bubbles: true }));
}

function announceFailed() {
  root.value?.dispatchEvent(
    new CustomEvent("entry-failed", { bubbles: true, detail: { message: errorText.value } }),
  );
}

// ── Opening and closing (campaign dates) ──
/** "pending" until the dates come; without `formFieldsUrl` there are none to wait for. */
const phase = ref<CampaignPhase | "pending">(campaignDates ? "pending" : "open");
let stopPhase = () => {};

function announcePhase(next: CampaignPhase, message: string) {
  root.value?.dispatchEvent(
    new CustomEvent("campaign-phase", { bubbles: true, detail: { phase: next, message } }),
  );
}

function onPhase(next: CampaignPhase, message: string) {
  // An entry being sent, or its thanks / error on screen, stays as it is.
  if (state.value !== "idle") return;
  phase.value = next;
  // "open" is announced when the form shows (see `formShown`), not before.
  if (next !== "open") announcePhase(next, message);
}

function watchPhase() {
  if (!campaignDates) return;
  stopPhase = watchCampaignPhase({
    dates: campaignDates,
    now: campaignClock(location.href),
    onPhase: (next, dates) => onPhase(next, phaseMessage(next, dates)),
    // Not the API's answer: only why there are no dates (so the form stays closed).
    warn: (reason) =>
      console.warn(`[UniversalFormV1] no campaign dates (${reason}): the form stays closed`),
  });
}

// ── Dependent fields (`dependsOn`) ──
const sources = dependencySources(v1.config.fields);
let resolved = resolveFields(v1.config.fields, {});

/**
 * v1's config with the fields as the current values leave them (browser only: site
 * links made absolute; selects as v1's custom dropdown where the native popup can't
 * be styled, see fieldStyles.ts).
 */
const liveConfig = () => ({
  ...v1.config,
  fields: withStyledSelects(
    withAbsoluteLinks(resolved.fields, location.href),
    supportsBaseSelect(),
  ),
});

/**
 * Disabled fields: `inert` on the field itself and `data-disabled` on its wrapper
 * (by name: v1 reuses wrappers by position). The wrapper stays live so the links
 * of its note can still be followed.
 */
function markDisabled() {
  const disabled = new Set(resolved.disabled);
  for (const form of forms) {
    for (const wrapper of form.querySelectorAll(".field-wrapper")) {
      const off = disabled.has(wrapperName(wrapper));
      wrapper.firstElementChild?.toggleAttribute("inert", off);
      wrapper.toggleAttribute("data-disabled", off);
    }
  }
}

// ── Notes under fields (`noteHtml`) ──
const NOTE_CLASS = "field-note";
const notes = new Map(v1.config.fields.flatMap((f) => (f.noteHtml ? [[f.name, f.noteHtml]] : [])));

/** Redraws every note under its field (v1 reuses wrappers by position, so by name). */
function applyFieldNotes() {
  if (notes.size === 0) return;
  for (const form of forms) {
    for (const old of form.querySelectorAll(`.${NOTE_CLASS}`)) old.remove();
    for (const wrapper of form.querySelectorAll(".field-wrapper")) {
      const html = notes.get(wrapperName(wrapper));
      if (!html) continue;
      const note = document.createElement("p");
      note.className = NOTE_CLASS;
      note.innerHTML = html; // trusted site copy (content/config.json)
      wrapper.append(note);
    }
  }
}

// ── Phone keyboards and length caps (`validate.inputMode`, `validate.maxLength`) ──
const inputAttributes = new Map(
  v1.config.fields.flatMap((f) => {
    const attributes: [string, string][] = [];
    if (f.validate?.inputMode) attributes.push(["inputmode", f.validate.inputMode]);
    if (f.validate?.maxLength) attributes.push(["maxlength", String(f.validate.maxLength)]);
    return attributes.length ? [[f.name, attributes]] : [];
  }),
);

/** The `<input>` inside the v1 field `control` (its shadow DOM). */
const innerInput = (control: Element | null | undefined) =>
  control?.shadowRoot?.querySelector<HTMLInputElement>("input") ?? null;

/** Sets each field's `inputmode` / `maxlength` on its input (v1 has no option for them). */
function applyInputAttributes() {
  for (const form of forms) {
    for (const wrapper of form.querySelectorAll(".field-wrapper")) {
      const input = innerInput(wrapper.firstElementChild);
      for (const [name, value] of inputAttributes.get(wrapperName(wrapper)) ?? []) {
        input?.setAttribute(name, value);
      }
    }
  }
}

async function onFieldChange(event: Event) {
  const { name, value } = (event as CustomEvent<{ name?: string; value?: unknown }>).detail ?? {};
  if (!name) return;
  checkRule(name, value);
  if (!sources.has(name)) return;
  // v1 redraws the fields (reusing wrappers by position): no note may land under another one.
  clearRuleErrors();
  const values = collectValues(
    fieldOrder(v1.config),
    forms.map((f) => f.values ?? {}),
  );
  resolved = resolveFields(v1.config.fields, values);
  if (sections) {
    forms.forEach((el, i) => (el.config = sectionConfig(liveConfig(), sections[i]!)));
  } else if (forms[0]) {
    forms[0].config = singleConfig(locked.value);
  }
  for (const stale of resolved.clear) {
    forms.find((f) => f.values && stale in f.values)?.setValue?.(stale, "");
  }
  await Promise.all(forms.map((f) => f.updateComplete));
  markDisabled();
  applyFieldNotes();
  applyInputAttributes();
  forms.forEach(applyFieldStyles);
  // The redraw dropped the rule errors: back under the fields whose value still breaks its rule.
  showRuleErrors(ruleErrors(v1.config.fields, values));
}

/**
 * What gets POSTed: the values of the fields on screen (hidden ones don't travel)
 * + metadata + `language`, the page's language ("en", "es", "fr").
 */
function entryPayload(values: Record<string, unknown>, metadata: Record<string, unknown>) {
  return {
    ...buildSubmissionPayload(
      withoutHidden(values, v1.config.fields, resolved),
      metadata,
      resolved.fields,
    ),
    language: site.locale,
  };
}

/** Single form: the element's config with its own submit button locked (and relabelled) or not. */
function singleConfig(locked: boolean, label = v1.config.submit?.label) {
  return { ...liveConfig(), submit: { ...v1.config.submit, label, disabled: locked } };
}

async function onSingleSubmit(event: Event) {
  const el = forms[0];
  if (!el || state.value === "sending" || state.value === "sent") return;
  const { values = {}, metadata = {} } =
    (event as CustomEvent<{ values?: Record<string, unknown>; metadata?: Record<string, unknown> }>)
      .detail ?? {};
  if (!passesRules(values)) return;
  el.config = singleConfig(true, v1.messages.sending);
  const ok = await submit(entryPayload(values, metadata));
  // Keep the button locked after a success so the same entry isn't sent twice.
  el.config = singleConfig(ok);
  if (ok) announceSent();
  else announceFailed();
}

/** v1's own metadata (UTMs, fingerprint…): `submit()` fires `uf-submit` without sending anything. */
function requestMetadata(form: FormEl): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const done = (metadata: Record<string, unknown>) => {
      clearTimeout(timer);
      form.removeEventListener("uf-submit", onEvent);
      resolve(metadata);
    };
    const onEvent = (e: Event) =>
      done((e as CustomEvent<{ metadata?: Record<string, unknown> }>).detail?.metadata ?? {});
    const timer = setTimeout(() => done(pageMetadata()), 3000);
    form.addEventListener("uf-submit", onEvent);
    if (!form.submit?.()) done(pageMetadata());
  });
}

/** Moves focus to the first field in error, in screen order (v1 paints errors on the next render). */
async function focusFirstError() {
  await Promise.all(forms.map((f) => f.updateComplete));
  await new Promise((resolve) => requestAnimationFrame(resolve));
  for (const form of forms) {
    for (const wrapper of form.querySelectorAll(".field-wrapper")) {
      const control = wrapper.firstElementChild;
      const inner = control?.shadowRoot?.querySelector<HTMLElement>(
        "input, select, [role='combobox']",
      );
      const invalid =
        wrapper.querySelector(".field-required-error") !== null ||
        inner?.getAttribute("aria-invalid") === "true";
      if (invalid) {
        (inner ?? (control as HTMLElement | null))?.focus();
        return;
      }
    }
  }
}

async function onPageSubmit() {
  if (locked.value) return;
  busy.value = true;
  try {
    const result = await submitSections({
      forms: forms as SectionForm[],
      order: fieldOrder(v1.config),
      check: passesRules,
      send: async (values) => {
        const metadata = await requestMetadata(forms[0]!);
        return submit(entryPayload(values, metadata));
      },
    });
    if (result.status === "invalid") void focusFirstError();
    if (result.status === "sent") announceSent();
    if (result.status === "failed") announceFailed();
  } finally {
    busy.value = false;
  }
}

function createForm(attrs: Record<string, string>): FormEl {
  // Created imperatively so Vue never tries to resolve the tag as a component.
  const el = document.createElement("universal-form") as FormEl;
  el.setAttribute("env", env);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, value);
  return el;
}

function mountForms() {
  if (sections) {
    for (const section of sections) {
      const el = createForm({
        config: JSON.stringify(sectionConfig(liveConfig(), section)),
        "step-indicator": "none",
        "data-section": section.id,
        "data-columns": String(section.columns),
      });
      el.addEventListener("uf-change", onFieldChange);
      if (section.titleHtml) {
        // v1 harvests children with `slot-step` and shows them above the step's fields.
        const block = document.createElement("div");
        block.setAttribute("slot-step", "1");
        block.innerHTML = section.titleHtml; // trusted site copy (content/config.json)
        el.append(block);
      }
      forms.push(el);
      formsHost.value?.append(el);
    }
  } else {
    const el = createForm({ config: JSON.stringify(singleConfig(false)) });
    if (v1.skeleton) el.setAttribute("skeleton", JSON.stringify(v1.skeleton));
    el.addEventListener("uf-submit", onSingleSubmit);
    el.addEventListener("uf-change", onFieldChange);
    forms.push(el);
    formsHost.value?.append(el);
  }
}

function unmountForms() {
  for (const el of forms) {
    el.removeEventListener("uf-submit", onSingleSubmit);
    el.removeEventListener("uf-change", onFieldChange);
    el.remove();
  }
  forms.length = 0;
}

// ── Page loader: nothing of the form is visible until every <universal-form> is ready ──
const LOAD_TIMEOUT_MS = 15_000;
/** The loader stays up at least this long, even if the form is ready sooner. */
const LOADER_MIN_MS = 2500;
const loadState = ref<LoadState>("idle");
let attempt = 0;
let unmounted = false;

const dispatch = (event: LoadEvent) => (loadState.value = nextLoadState(loadState.value, event));

/** Only the loader until the dates come and, once open, until the form is ready. */
const showLoader = computed(
  () => phase.value === "pending" || (phase.value === "open" && loadState.value !== "ready"),
);
const formShown = computed(() => phase.value === "open" && loadState.value === "ready");
// When the form shows, its sections and the submit button rise in, one after another (GSAP).
const { run: animate } = useMotion(root);
watch(formShown, (shown) => {
  if (!shown) return;
  announcePhase("open", "");
  animate((root) =>
    gsap.fromTo(
      root.querySelectorAll(
        ".universal-form-v1__forms > universal-form, .universal-form-v1__submit",
      ),
      { autoAlpha: 0, y: 40 },
      {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        stagger: 0.15,
        ease: "power3.out",
        clearProps: "transform,opacity,visibility",
      },
    ),
  );
});

/** v1 sets `data-ready` on the host once its fields are final (components loaded and drawn). */
const allReady = () => forms.length > 0 && forms.every((f) => f.hasAttribute("data-ready"));

function watchReady(notify: () => void) {
  const observer = new MutationObserver(notify);
  for (const el of forms)
    observer.observe(el, { attributes: true, attributeFilter: ["data-ready"] });
  return () => observer.disconnect();
}

async function load() {
  const mine = ++attempt;
  const startedAt = Date.now();
  dispatch(loadState.value === "error" ? "retry" : "start");
  unmountForms();
  resolved = resolveFields(v1.config.fields, {}); // new forms start empty
  mountForms();
  let src = v1.scriptUrl;
  if (mine > 1 && !customElements.get("universal-form")) {
    // The first request failed: a module script that failed stays failed for that URL.
    document.getElementById(SCRIPT_ID)?.remove();
    src += `${src.includes("?") ? "&" : "?"}retry=${mine}`;
  }
  ensureModuleScript(document, src, SCRIPT_ID, v1.scriptIntegrity);
  // The devForm token is asked for now so the submit doesn't wait for it; the loader
  // only waits a few seconds for it (see awaitReady).
  const ready = await awaitReady({
    check: allReady,
    subscribe: watchReady,
    timeoutMs: LOAD_TIMEOUT_MS,
    extra: prepare(),
  });
  if (unmounted || mine !== attempt) return;
  if (ready) {
    // Let the fields' own components finish drawing before revealing.
    await Promise.all(forms.map((f) => f.updateComplete));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    forms.forEach(applyFieldStyles);
    markDisabled();
    applyFieldNotes();
    applyInputAttributes();
    const remaining = LOADER_MIN_MS - (Date.now() - startedAt);
    if (remaining > 0) await new Promise((resolve) => setTimeout(resolve, remaining));
    if (unmounted || mine !== attempt) return;
  }
  dispatch(ready ? "ready" : "fail");
}

onMounted(() => {
  watchPhase();
  void load();
});

onBeforeUnmount(() => {
  unmounted = true;
  stopPhase();
  cancel();
  unmountForms();
});
</script>

<template>
  <div
    ref="root"
    class="universal-form-v1"
    :data-state="state"
    :data-load="loadState"
    :data-phase="phase"
    :aria-busy="showLoader && loadState !== 'error'"
  >
    <FormLoader
      v-if="showLoader"
      :state="phase === 'open' && loadState === 'error' ? 'error' : 'loading'"
      :loading-text="v1.messages.loading"
      :error-text="v1.messages.loadError"
      :retry-text="v1.messages.retry"
      @retry="load"
    />
    <!-- Mounted from the start but hidden (not display:none: v1 measures its width) until shown. -->
    <div class="universal-form-v1__content" :class="{ 'is-pending': !formShown }">
      <div ref="formsHost" class="universal-form-v1__forms"></div>
      <button
        v-if="sections"
        type="button"
        class="universal-form-v1__submit"
        :class="{ 'is-loading': locked && state !== 'sent' }"
        :disabled="locked"
        @click="onPageSubmit"
      >
        {{ buttonLabel }}
      </button>
      <p v-if="errorText" class="universal-form-v1__error" role="alert">{{ errorText }}</p>
    </div>
  </div>
</template>

<style scoped>
.universal-form-v1 {
  width: calc(100% - 40px);
  max-width: 544px;
  margin: 0 auto;
}

.universal-form-v1__content.is-pending {
  visibility: hidden;
  height: 0;
  overflow: hidden;
}

.universal-form-v1__forms :deep(universal-form) {
  display: block;
  width: 100%;
}

.universal-form-v1__error {
  margin: 1rem 0 0;
  color: var(--oneid-text-error-color);
  font-size: 14px;
  text-align: center;
}
</style>
