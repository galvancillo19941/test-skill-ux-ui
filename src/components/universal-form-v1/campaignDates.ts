/**
 * Opening and closing of the form with the campaign's dates in Probability.
 * `service/get-form-fields/<program>` answers `data.dateValidations`:
 * `startDate` / `endDate` (ISO 8601 with a time zone) and the messages shown
 * before opening and after closing.
 *
 * The page asks that endpoint ONCE on load, for the `devForm` token
 * (useEntrySubmission.ts); the dates are read from that same answer, so there
 * is no request of its own here.
 *
 * The phase is the current second against the dates' seconds, edges excluded
 * (the same rule as Probability's own form): up to and including the opening
 * second it is "upcoming", from the closing second on it is "closed".
 *
 * Without dates (network error, non-2xx such as the 403 "Invalid origin", not
 * JSON, dates missing or unreadable) there is no phase: the form never opens.
 */

export type CampaignPhase = "upcoming" | "open" | "closed";

export interface CampaignDates {
  /** Opening and closing instants, in epoch milliseconds. */
  start: number;
  end: number;
  startMessage: string;
  endMessage: string;
}

export type DatesResult = { ok: true; dates: CampaignDates } | { ok: false; reason: string };

/** How often the phase is checked while the page is visible. */
export const PHASE_CHECK_MS = 1000;

/** An ISO 8601 date-time that carries its time zone (`Z` or `±hh:mm`). */
const ISO_WITH_ZONE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})$/i;

/** Epoch ms of an ISO date-time with a time zone; NaN for anything else. */
function instant(value: unknown): number {
  return typeof value === "string" && ISO_WITH_ZONE.test(value.trim())
    ? Date.parse(value.trim())
    : Number.NaN;
}

/** The dates of a get-form-fields answer, or null when either is missing or unreadable. */
export function parseCampaignDates(body: unknown): CampaignDates | null {
  const v = (body as { data?: { dateValidations?: Record<string, unknown> } } | undefined)?.data
    ?.dateValidations;
  if (!v || typeof v !== "object") return null;
  const start = instant(v.startDate);
  const end = instant(v.endDate);
  if (Number.isNaN(start) || Number.isNaN(end)) return null;
  const text = (message: unknown) => (typeof message === "string" ? message.trim() : "");
  return { start, end, startMessage: text(v.startDateMessage), endMessage: text(v.endDateMessage) };
}

const second = (ms: number) => Math.floor(ms / 1000);

/** The phase at `now` (epoch ms), compared to the second. */
export function campaignPhase(
  now: number,
  dates: Pick<CampaignDates, "start" | "end">,
): CampaignPhase {
  const s = second(now);
  if (s <= second(dates.start)) return "upcoming";
  if (s >= second(dates.end)) return "closed";
  return "open";
}

/** The message to show in `phase` ("" while open). */
export function phaseMessage(phase: CampaignPhase, dates: CampaignDates): string {
  if (phase === "upcoming") return dates.startMessage;
  if (phase === "closed") return dates.endMessage;
  return "";
}

/** The dates of a get-form-fields answer (`ok`/`status` of the response, its JSON body or undefined). */
export function campaignDatesOf(
  response: Pick<Response, "ok" | "status">,
  body: unknown,
): DatesResult {
  if (!response.ok) return { ok: false, reason: `HTTP ${response.status}` };
  if (body === undefined) return { ok: false, reason: "the answer is not JSON" };
  const dates = parseCampaignDates(body);
  return dates ? { ok: true, dates } : { ok: false, reason: "no startDate/endDate" };
}

/**
 * Once `dates` (the answer of the page's get-form-fields request) comes, reports the phase (`onPhase`) right
 * away and again each time it changes, checking every second while the page
 * is visible and at once when it becomes visible again (a periodic check, not
 * one timer set to the date: long timers overflow and a sleeping device wakes
 * up past it). Without dates `onPhase` is never called and `warn` says why.
 * Returns `stop()`: stops every check and ignores an answer still to come.
 */
export function watchCampaignPhase(options: {
  dates: Promise<DatesResult>;
  onPhase: (phase: CampaignPhase, dates: CampaignDates) => void;
  warn: (reason: string) => void;
  now?: () => number;
  page?: Pick<Document, "hidden" | "addEventListener" | "removeEventListener">;
}): () => void {
  const { onPhase, warn, now = Date.now, page = document } = options;
  let dates: CampaignDates | null = null;
  let last: CampaignPhase | null = null;
  let timer: ReturnType<typeof setInterval> | undefined;
  let stopped = false;

  const check = () => {
    if (!dates) return;
    const phase = campaignPhase(now(), dates);
    if (phase === last) return;
    last = phase;
    onPhase(phase, dates);
  };
  const pause = () => {
    clearInterval(timer);
    timer = undefined;
  };
  const resume = () => {
    check();
    timer ??= setInterval(check, PHASE_CHECK_MS);
  };
  const onVisibility = () => (page.hidden ? pause() : resume());

  void options.dates.then((result) => {
    if (stopped) return;
    if (!result.ok) {
      warn(result.reason);
      return;
    }
    dates = result.dates;
    check();
    page.addEventListener("visibilitychange", onVisibility);
    if (!page.hidden) resume();
  });

  return () => {
    stopped = true;
    pause();
    page.removeEventListener("visibilitychange", onVisibility);
  };
}

/**
 * `vp dev` only: `?campaign-now=<ISO date-time>` moves the clock to that
 * instant (it keeps running from there) to try the phases without touching the
 * campaign. Production builds always use the real time.
 */
export function campaignClock(href: string): () => number {
  if (!import.meta.env.DEV) return Date.now;
  let target = Number.NaN;
  try {
    target = Date.parse(new URL(href).searchParams.get("campaign-now") ?? "");
  } catch {
    target = Number.NaN;
  }
  if (Number.isNaN(target)) return Date.now;
  const offset = target - Date.now();
  return () => Date.now() + offset;
}
