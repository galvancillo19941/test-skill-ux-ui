import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import {
  campaignDatesOf,
  campaignPhase,
  parseCampaignDates,
  phaseMessage,
  watchCampaignPhase,
  type CampaignPhase,
  type DatesResult,
} from "./campaignDates.ts";

const VALIDATIONS = {
  startDate: "2026-10-05T18:22:00-04:00",
  startDateMessage: "Sorry, this promotion has not started yet",
  endDate: "2026-11-26T18:22:00-05:00",
  endDateMessage: "Sorry, this promotion is over",
};
const START = Date.parse("2026-10-05T22:22:00Z");
const END = Date.parse("2026-11-26T23:22:00Z");

const BODY = { data: { dateValidations: VALIDATIONS } };
const DATES: DatesResult = campaignDatesOf({ ok: true, status: 200 }, BODY);

describe("parseCampaignDates", () => {
  test("reads the dates as absolute instants (their own time zone) and the messages", () => {
    expect(parseCampaignDates({ data: { dateValidations: VALIDATIONS } })).toEqual({
      start: START,
      end: END,
      startMessage: VALIDATIONS.startDateMessage,
      endMessage: VALIDATIONS.endDateMessage,
    });
  });

  test("a missing, unreadable or zone-less date gives no dates", () => {
    const withDate = (patch: Record<string, unknown>) =>
      parseCampaignDates({ data: { dateValidations: { ...VALIDATIONS, ...patch } } });
    expect(withDate({ startDate: undefined })).toBeNull();
    expect(withDate({ endDate: "" })).toBeNull();
    expect(withDate({ endDate: "soon" })).toBeNull();
    expect(withDate({ startDate: "2026-10-05T18:22:00" })).toBeNull(); // local time: ambiguous
    expect(parseCampaignDates({ data: {} })).toBeNull();
    expect(parseCampaignDates(undefined)).toBeNull();
  });

  test("missing messages become empty texts", () => {
    const dates = parseCampaignDates({
      data: { dateValidations: { startDate: VALIDATIONS.startDate, endDate: "2026-11-26T23:22Z" } },
    });
    expect(dates).toMatchObject({ end: END, startMessage: "", endMessage: "" });
  });
});

describe("campaignPhase", () => {
  const dates = { start: START, end: END };

  test("upcoming up to and including the opening second", () => {
    expect(campaignPhase(START - 60_000, dates)).toBe("upcoming");
    expect(campaignPhase(START, dates)).toBe("upcoming");
    expect(campaignPhase(START + 999, dates)).toBe("upcoming");
  });

  test("open strictly between the two seconds", () => {
    expect(campaignPhase(START + 1000, dates)).toBe("open");
    expect(campaignPhase(END - 1, dates)).toBe("open");
  });

  test("closed from the closing second on", () => {
    expect(campaignPhase(END, dates)).toBe("closed");
    expect(campaignPhase(END + 86_400_000, dates)).toBe("closed");
  });

  test("milliseconds of the dates don't count", () => {
    expect(campaignPhase(START + 1000, { start: START + 999, end: END })).toBe("open");
  });

  test("the message of each phase", () => {
    const full = parseCampaignDates({ data: { dateValidations: VALIDATIONS } })!;
    expect(phaseMessage("upcoming", full)).toBe(VALIDATIONS.startDateMessage);
    expect(phaseMessage("closed", full)).toBe(VALIDATIONS.endDateMessage);
    expect(phaseMessage("open", full)).toBe("");
  });
});

describe("campaignDatesOf", () => {
  test("the dates of a 2xx JSON answer", () => {
    expect(campaignDatesOf({ ok: true, status: 200 }, BODY)).toMatchObject({
      ok: true,
      dates: { start: START, end: END },
    });
  });

  test("failures: non-2xx (403 Invalid origin), not JSON, no dates", () => {
    expect(campaignDatesOf({ ok: false, status: 403 }, { message: "Invalid origin" })).toEqual({
      ok: false,
      reason: "HTTP 403",
    });
    expect(campaignDatesOf({ ok: true, status: 200 }, undefined)).toMatchObject({ ok: false });
    expect(campaignDatesOf({ ok: true, status: 200 }, { data: {} })).toMatchObject({ ok: false });
  });
});

describe("watchCampaignPhase", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** A page whose visibility the test flips. */
  function fakePage() {
    const listeners = new Set<() => void>();
    return {
      hidden: false,
      addEventListener: (_: string, cb: () => void) => listeners.add(cb),
      removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
      setHidden(value: boolean) {
        this.hidden = value;
        listeners.forEach((cb) => cb());
      },
      listeners,
    };
  }

  function watch(
    clock: { now: number },
    dates: Promise<DatesResult> = Promise.resolve(DATES),
    page = fakePage(),
  ) {
    const phases: CampaignPhase[] = [];
    const warn = vi.fn();
    const stop = watchCampaignPhase({
      dates,
      onPhase: (phase) => phases.push(phase),
      warn,
      now: () => clock.now,
      page: page as unknown as Document,
    });
    return { phases, warn, stop, page };
  }

  test("reports the phase once the dates come, then only when it changes", async () => {
    const clock = { now: START - 2000 };
    const { phases } = watch(clock);
    await vi.advanceTimersByTimeAsync(0);
    expect(phases).toEqual(["upcoming"]);
    for (let i = 0; i < 4; i++) {
      clock.now += 1000;
      await vi.advanceTimersByTimeAsync(1000);
    }
    expect(phases).toEqual(["upcoming", "open"]);
    clock.now = END;
    await vi.advanceTimersByTimeAsync(1000);
    expect(phases).toEqual(["upcoming", "open", "closed"]);
  });

  test("without dates: no phase, a warning, no checks left running", async () => {
    const { phases, warn } = watch(
      { now: START + 5000 },
      Promise.resolve({ ok: false, reason: "HTTP 403" }),
    );
    await vi.advanceTimersByTimeAsync(5000);
    expect(phases).toEqual([]);
    expect(warn).toHaveBeenCalledWith("HTTP 403");
    expect(vi.getTimerCount()).toBe(0);
  });

  test("pauses while hidden and checks at once when visible again", async () => {
    const clock = { now: START - 1000 };
    const { phases, page } = watch(clock);
    await vi.advanceTimersByTimeAsync(0);
    page.setHidden(true);
    expect(vi.getTimerCount()).toBe(0);
    clock.now = END + 1000; // the device slept past both dates
    page.setHidden(false);
    expect(phases).toEqual(["upcoming", "closed"]);
    expect(vi.getTimerCount()).toBe(1);
  });

  test("stop() before the answer: it is ignored and nothing is left running", async () => {
    let answer!: (result: DatesResult) => void;
    const { phases, warn, stop, page } = watch(
      { now: START + 5000 },
      new Promise((resolve) => (answer = resolve)),
    );
    stop();
    answer(DATES);
    await vi.advanceTimersByTimeAsync(2000);
    expect(phases).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    expect(page.listeners.size).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  test("stop() after the dates came stops the checks", async () => {
    const { stop, page } = watch({ now: START + 5000 });
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(1);
    stop();
    expect(vi.getTimerCount()).toBe(0);
    expect(page.listeners.size).toBe(0);
  });
});
