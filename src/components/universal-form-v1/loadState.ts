/**
 * Load state of a page-level form loader (idle → loading → ready | error, with
 * retry) and the wait that drives it. Pure: no DOM, no Vue, testable with fake
 * timers.
 */
export type LoadState = "idle" | "loading" | "ready" | "error";
export type LoadEvent = "start" | "ready" | "fail" | "retry";

export function nextLoadState(state: LoadState, event: LoadEvent): LoadState {
  switch (event) {
    case "start":
      return state === "idle" ? "loading" : state;
    case "ready":
      return state === "loading" ? "ready" : state;
    case "fail":
      return state === "loading" ? "error" : state;
    case "retry":
      return state === "error" ? "loading" : state;
  }
}

/**
 * Resolves `true` once `check()` is true (checked now and on every `subscribe`
 * notification) AND `extra` — optional work such as the devForm token — has
 * settled or `extraTimeoutMs` has passed, so it can never hold the loader for
 * long. Resolves `false` if `check()` is still false after `timeoutMs`.
 * `extra` failing doesn't fail the wait.
 */
export function awaitReady(options: {
  check: () => boolean;
  subscribe: (notify: () => void) => () => void;
  timeoutMs: number;
  extra?: Promise<unknown>;
  extraTimeoutMs?: number;
}): Promise<boolean> {
  const { check, subscribe, timeoutMs, extra, extraTimeoutMs = 4000 } = options;
  return new Promise((resolve) => {
    let checked = check();
    let extraDone = !extra;
    let finished = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let unsubscribe = () => {};

    const finish = (value: boolean) => {
      if (finished) return;
      finished = true;
      timers.forEach(clearTimeout);
      unsubscribe();
      resolve(value);
    };
    const settle = () => {
      if (checked && extraDone) finish(true);
    };

    if (extra) {
      const done = () => {
        extraDone = true;
        settle();
      };
      extra.then(done, done);
      timers.push(setTimeout(done, extraTimeoutMs));
    }
    timers.push(setTimeout(() => finish(false), timeoutMs));
    unsubscribe = subscribe(() => {
      if (!checked) checked = check();
      settle();
    });
    settle();
  });
}
