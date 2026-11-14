import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test";
import { awaitReady, nextLoadState } from "./loadState.ts";

describe("nextLoadState", () => {
  test("idle → loading → ready", () => {
    expect(nextLoadState("idle", "start")).toBe("loading");
    expect(nextLoadState("loading", "ready")).toBe("ready");
  });

  test("loading → error on failure, error → loading on retry", () => {
    expect(nextLoadState("loading", "fail")).toBe("error");
    expect(nextLoadState("error", "retry")).toBe("loading");
  });

  test("late or out-of-order events are ignored (ready stays ready)", () => {
    expect(nextLoadState("ready", "fail")).toBe("ready");
    expect(nextLoadState("ready", "retry")).toBe("ready");
    expect(nextLoadState("idle", "ready")).toBe("idle");
    expect(nextLoadState("loading", "retry")).toBe("loading");
    expect(nextLoadState("error", "ready")).toBe("error");
  });
});

describe("awaitReady", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  /** A condition the test flips by hand, with the subscribe/notify pair. */
  function condition() {
    let value = false;
    const listeners = new Set<() => void>();
    return {
      check: () => value,
      subscribe: (cb: () => void) => {
        listeners.add(cb);
        return () => listeners.delete(cb);
      },
      set(next: boolean) {
        value = next;
        listeners.forEach((cb) => cb());
      },
      listeners,
    };
  }

  test("already ready → true right away", async () => {
    const c = condition();
    c.set(true);
    expect(await awaitReady({ ...c, timeoutMs: 1000 })).toBe(true);
  });

  test("becomes ready later → true, and unsubscribes", async () => {
    const c = condition();
    const p = awaitReady({ ...c, timeoutMs: 1000 });
    c.set(true);
    expect(await p).toBe(true);
    expect(c.listeners.size).toBe(0);
  });

  test("never ready → false after the timeout", async () => {
    const c = condition();
    const p = awaitReady({ ...c, timeoutMs: 1000 });
    await vi.advanceTimersByTimeAsync(1000);
    expect(await p).toBe(false);
    expect(c.listeners.size).toBe(0);
  });

  test("waits for the extra work (devForm) when it answers in time", async () => {
    const c = condition();
    c.set(true);
    let finish!: () => void;
    const extra = new Promise<void>((r) => (finish = r));
    let result: boolean | undefined;
    void awaitReady({ ...c, timeoutMs: 15000, extra }).then((v) => (result = v));
    await vi.advanceTimersByTimeAsync(1000);
    expect(result).toBeUndefined();
    finish();
    await vi.advanceTimersByTimeAsync(0);
    expect(result).toBe(true);
  });

  test("a slow extra can't hold the loader past its own cap", async () => {
    const c = condition();
    c.set(true);
    const extra = new Promise<void>(() => {}); // never settles
    const p = awaitReady({ ...c, timeoutMs: 15000, extra, extraTimeoutMs: 4000 });
    await vi.advanceTimersByTimeAsync(4000);
    expect(await p).toBe(true);
  });

  test("a failing extra doesn't fail the wait", async () => {
    const c = condition();
    c.set(true);
    const p = awaitReady({ ...c, timeoutMs: 1000, extra: Promise.reject(new Error("x")) });
    expect(await p).toBe(true);
  });
});
