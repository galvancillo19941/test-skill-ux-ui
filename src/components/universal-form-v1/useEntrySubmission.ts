import { ref, type Ref } from "vue";
import type { UniversalFormV1Field } from "../../site/schema.ts";
import { campaignDatesOf, type DatesResult } from "./campaignDates.ts";

/**
 * Sends a Universal Form v1 entry to the Probability submission endpoint
 * (`/submission/<env>/<program>`), the way the previous web component did:
 *
 *   1. On mount it asks `service/get-form-fields/<program>` (read-only POST,
 *      body `{ env, url, utm_*, userAgent }`) for the `devForm` token the
 *      submission service expects. The token expires after 10 minutes, so one
 *      older than 9 is asked for again right before sending. If it can't be
 *      had, the entry is still sent (without it) and the service's answer is
 *      shown like any other. The same answer carries the campaign's opening
 *      and closing dates (`data.dateValidations`, see campaignDates.ts): the
 *      first answer is also the page's dates, so the endpoint is asked once.
 *   2. The entry is a `POST` with `Content-Type: application/json` and a FLAT
 *      body: every field value at the top level (checkboxes as booleans), the
 *      visit metadata (`url`, `http_referrer`, `userAgent`, `utm_*`, `dev`) and
 *      `devForm`. `http_referrer` always travels: the page the visitor came
 *      from, as the browser gives it (see `externalReferrer`), or "" when there
 *      is none; the other metadata only when it has a value. The page adds
 *      `language` (its language, "en" / "es" / "fr") to that body.
 *   3. Success is a 2xx whose body says `success: true`, or — when `success`
 *      is absent — `statusCode: 200`. Anything else is a refusal, with
 *      `error.detail` as the reason when the service gives one.
 */

/** Visit metadata keys the old web component sent (v1 collects all of them). */
const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_term", "utm_content"];
const METADATA_KEYS = ["url", "http_referrer", "userAgent", "dev", ...UTM_KEYS];

const TIMEOUT_MS = 10_000;
/** devForm tokens last 10 minutes; renew with a minute to spare. */
export const DEV_FORM_MAX_AGE_MS = 9 * 60_000;

export type SubmitResult = { ok: true } | { ok: false; detail: string };
export type SubmitState = "idle" | "sending" | "sent" | "error";
export interface PageInfo {
  href: string;
  userAgent: string;
}

/** Diagnostics for development only: production builds don't echo API answers to the console. */
function debug(...args: unknown[]): void {
  if (import.meta.env.DEV) console.warn("[UniversalFormV1]", ...args);
}

const currentPage = (): PageInfo => ({ href: location.href, userAgent: navigator.userAgent });

/**
 * Where the visitor came from: `referrer` (`document.referrer`, which v1 sends
 * as is) unless it is this same site. A page that navigates to itself (a link
 * to its own URL, a script setting `location.href`) gets ITSELF as referrer,
 * and that is not a referral: "". The browser decides the rest: another site
 * usually gives only its origin (`https://l.facebook.com/`, the default
 * `strict-origin-when-cross-origin`), nothing when it asks so (`no-referrer`)
 * or when an https page links to an http one (so always "" on localhost from
 * the web), and a typed URL, a bookmark, an e-mail or an app give nothing.
 */
export function externalReferrer(referrer: unknown, pageUrl: unknown): string {
  if (typeof referrer !== "string" || referrer === "") return "";
  try {
    const from = new URL(referrer);
    if (typeof pageUrl === "string" && from.origin === new URL(pageUrl).origin) return "";
  } catch {
    return "";
  }
  return referrer;
}

/** The flat body: values (checkbox "true"/"" → true/false) + known metadata (`http_referrer` always). */
export function buildSubmissionPayload(
  values: Record<string, unknown>,
  metadata: Record<string, unknown>,
  fields: readonly Pick<UniversalFormV1Field, "name" | "type">[],
): Record<string, unknown> {
  const payload: Record<string, unknown> = { ...values };
  for (const field of fields) {
    if (field.type === "checkbox") payload[field.name] = values[field.name] === "true";
  }
  for (const key of METADATA_KEYS) {
    if (metadata[key] !== undefined && metadata[key] !== "") payload[key] = metadata[key];
  }
  payload.http_referrer = externalReferrer(metadata.http_referrer, metadata.url);
  return payload;
}

/** Body of the get-form-fields request, as the old web component built it. */
export function formFieldsRequestBody(env: string, page: PageInfo): Record<string, string> {
  const body: Record<string, string> = { env, url: page.href };
  let search: URLSearchParams | undefined;
  try {
    search = new URL(page.href).searchParams;
  } catch {
    search = undefined;
  }
  for (const key of UTM_KEYS) {
    const value = search?.get(key);
    if (value) body[key] = value;
  }
  body.userAgent = page.userAgent;
  return body;
}

function detailOf(body: unknown): string {
  const b = body as { error?: { detail?: unknown }; message?: unknown } | undefined;
  const detail = b?.error?.detail ?? b?.message;
  return typeof detail === "string" ? detail.trim() : "";
}

/** `success: true`, or no `success` at all and `statusCode: 200`. */
export function isAccepted(body: unknown): boolean {
  const envelope = body as { success?: unknown; statusCode?: unknown } | undefined;
  if (!envelope || typeof envelope !== "object") return false;
  if ("success" in envelope) return envelope.success === true;
  return envelope.statusCode === 200;
}

/**
 * What a refusal shows: the text `shown` gives for the service's `detail`
 * (matched exactly), otherwise `fallback`.
 */
export function refusalMessage(
  detail: string,
  shown: Readonly<Record<string, string>>,
  fallback: string,
): string {
  return (detail && Object.hasOwn(shown, detail) && shown[detail]) || fallback;
}

export async function postEntry(
  url: string,
  payload: Record<string, unknown>,
  fetchImpl: typeof fetch = fetch,
): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    return { ok: false, detail: "" }; // network, CORS or timeout
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok && isAccepted(body)) return { ok: true };
  return { ok: false, detail: detailOf(body) };
}

/**
 * Keeps the `devForm` token: `refresh()` asks for a new one, `get()` returns
 * the current one or asks again when it is missing or older than 9 minutes.
 * Never throws; resolves to "" when no fresh token could be had. `dates` is the
 * campaign's dates from the first answer (or why there are none); `cancel()`
 * aborts a request still pending.
 */
export function createDevFormSource(options: {
  url: string;
  env: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  page?: () => PageInfo;
}): {
  refresh: () => Promise<string>;
  get: () => Promise<string>;
  dates: Promise<DatesResult>;
  cancel: () => void;
} {
  const { url, env, fetchImpl = fetch, now = Date.now, page = currentPage } = options;
  let token = "";
  let fetchedAt = 0;
  let inflight: Promise<string> | null = null;
  let controller: AbortController | null = null;
  // Settled by the first answer only (a later `resolve` does nothing).
  let resolveDates!: (result: DatesResult) => void;
  const dates = new Promise<DatesResult>((resolve) => (resolveDates = resolve));

  const fresh = () => token !== "" && now() - fetchedAt < DEV_FORM_MAX_AGE_MS;

  async function load(): Promise<string> {
    const mine = new AbortController();
    controller = mine;
    const timer = setTimeout(() => mine.abort(), TIMEOUT_MS);
    try {
      const response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formFieldsRequestBody(env, page())),
        signal: mine.signal,
      });
      const body = (await response.json().catch(() => undefined)) as
        | { data?: { devForm?: unknown } }
        | undefined;
      resolveDates(campaignDatesOf(response, body));
      const next = body?.data?.devForm;
      if (response.ok && typeof next === "string" && next) {
        token = next;
        fetchedAt = now();
      } else {
        debug("no devForm in the get-form-fields answer");
      }
    } catch (err) {
      resolveDates({ ok: false, reason: "network error" });
      debug("could not get devForm:", err);
    } finally {
      clearTimeout(timer);
      if (controller === mine) controller = null;
    }
    return fresh() ? token : "";
  }

  function refresh(): Promise<string> {
    inflight ??= load().finally(() => {
      inflight = null;
    });
    return inflight;
  }

  async function get(): Promise<string> {
    if (fresh()) return token;
    return refresh();
  }

  return { refresh, get, dates, cancel: () => controller?.abort() };
}

/**
 * Submission state for one form. `prepare()` (call on mount) fetches the
 * devForm token; `submit` adds it to the payload and ignores calls while a send
 * is in flight or after a success, so one press can never create two entries.
 * `campaignDates` is the dates from that same get-form-fields answer (null
 * without `formFieldsUrl`); `cancel()` (on unmount) aborts it if still pending.
 */
export function useEntrySubmission(options: {
  submitUrl: string;
  formFieldsUrl?: string;
  env: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
  page?: () => PageInfo;
}): {
  state: Ref<SubmitState>;
  errorDetail: Ref<string>;
  prepare: () => Promise<void>;
  submit: (payload: Record<string, unknown>) => Promise<boolean>;
  campaignDates: Promise<DatesResult> | null;
  cancel: () => void;
} {
  const { submitUrl, formFieldsUrl, fetchImpl = fetch } = options;
  const state = ref<SubmitState>("idle");
  const errorDetail = ref("");
  const devForm = formFieldsUrl
    ? createDevFormSource({ ...options, url: formFieldsUrl, fetchImpl })
    : null;

  async function prepare(): Promise<void> {
    await devForm?.refresh();
  }

  async function submit(payload: Record<string, unknown>): Promise<boolean> {
    if (state.value === "sending" || state.value === "sent") return false;
    state.value = "sending";
    errorDetail.value = "";
    const token = (await devForm?.get()) ?? "";
    const body = token ? { ...payload, devForm: token } : payload;
    const result = await postEntry(submitUrl, body, fetchImpl);
    if (result.ok) {
      state.value = "sent";
      return true;
    }
    state.value = "error";
    errorDetail.value = result.detail;
    if (result.detail) debug("submission refused:", result.detail);
    return false;
  }

  return {
    state,
    errorDetail,
    prepare,
    submit,
    campaignDates: devForm?.dates ?? null,
    cancel: () => devForm?.cancel(),
  };
}

/**
 * Adds `<script type="module" src id>` to <head> unless an element with `id`
 * exists. With `integrity` (SRI) the script is fetched in CORS mode and only
 * runs if its bytes match the hash.
 */
export function ensureModuleScript(
  doc: Pick<Document, "getElementById" | "createElement" | "head">,
  src: string,
  id: string,
  integrity?: string,
): void {
  if (doc.getElementById(id)) return;
  const script = doc.createElement("script");
  script.type = "module";
  script.src = src;
  script.id = id;
  if (integrity) {
    script.integrity = integrity;
    script.crossOrigin = "anonymous";
  }
  doc.head.appendChild(script);
}
