import { describe, expect, test, vi } from "vite-plus/test";
import {
  buildSubmissionPayload,
  DEV_FORM_MAX_AGE_MS,
  ensureModuleScript,
  externalReferrer,
  formFieldsRequestBody,
  isAccepted,
  postEntry,
  refusalMessage,
  useEntrySubmission,
} from "./useEntrySubmission.ts";

const SUBMIT = "https://api.helloprobability.io/submission/test/6ac016a105927c4e9b5bc570";
const FIELDS = "https://api.helloprobability.io/service/get-form-fields/6ac016a105927c4e9b5bc570";
const DATE_VALIDATIONS = {
  startDate: "2026-10-05T18:22:00-04:00",
  startDateMessage: "Not yet",
  endDate: "2026-11-26T18:22:00-05:00",
  endDateMessage: "Over",
};
const PAGE = { href: "https://site.test/?utm_source=x&utm_medium=", userAgent: "UA" };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

/** fetch mock answering `status` with `body` as JSON. */
const answer = (status: number, body: unknown) => vi.fn(async () => json(status, body));

const hrefOf = (u: string | URL | Request) =>
  typeof u === "string" ? u : u instanceof URL ? u.href : u.url;

/**
 * fetch mock routing by URL: get-form-fields answers with `devForm` tokens in
 * turn (or fails when `fieldsFail`), the submission with `submitBody`.
 */
function router(opts: { tokens?: string[]; fieldsFail?: boolean; submitBody?: unknown } = {}) {
  const tokens = [...(opts.tokens ?? ["tok-1"])];
  return vi.fn(async (url: string | URL | Request) => {
    if (hrefOf(url) === FIELDS) {
      if (opts.fieldsFail) throw new TypeError("Failed to fetch");
      return json(200, {
        success: true,
        data: { devForm: tokens.shift(), dateValidations: DATE_VALIDATIONS },
      });
    }
    return json(200, opts.submitBody ?? { success: true, statusCode: 200 });
  });
}

const callsTo = (fetchMock: ReturnType<typeof vi.fn>, url: string) =>
  fetchMock.mock.calls.filter(([u]) => hrefOf(u as string | URL | Request) === url) as unknown as [
    string,
    RequestInit,
  ][];

describe("buildSubmissionPayload", () => {
  const fields = [
    { name: "email", type: "email" as const },
    { name: "consent", type: "checkbox" as const },
  ];

  test("flat body: values + known metadata, checkbox as boolean, empty referrer kept", () => {
    const payload = buildSubmissionPayload(
      { email: "a@b.co", consent: "true" },
      {
        url: "https://site/?utm_source=x",
        http_referrer: "",
        userAgent: "UA",
        dev: "abc",
        utm_source: "x",
        devLayout: "ignored",
      },
      fields,
    );
    expect(payload).toEqual({
      email: "a@b.co",
      consent: true,
      url: "https://site/?utm_source=x",
      http_referrer: "",
      userAgent: "UA",
      dev: "abc",
      utm_source: "x",
    });
  });

  test('http_referrer: the referring site, or "" when there is none or it is the page itself', () => {
    const page = "https://www.site.test/?utm_source=facebook";
    const referrerOf = (metadata: Record<string, unknown>) =>
      buildSubmissionPayload({}, metadata, fields).http_referrer;
    expect(referrerOf({ url: page, http_referrer: "https://l.facebook.com/" })).toBe(
      "https://l.facebook.com/",
    );
    expect(referrerOf({ url: page, http_referrer: page })).toBe("");
    expect(referrerOf({ url: page })).toBe("");
    expect(referrerOf({})).toBe("");
  });

  test("unchecked checkbox is false", () => {
    expect(buildSubmissionPayload({ consent: "" }, {}, fields).consent).toBe(false);
  });
});

describe("externalReferrer", () => {
  const page = "http://localhost:5173/?utm_source=test";

  test("another site's address is kept as the browser gave it", () => {
    expect(externalReferrer("https://www.google.com/", page)).toBe("https://www.google.com/");
    expect(externalReferrer("http://127.0.0.1:5173/", page)).toBe("http://127.0.0.1:5173/");
  });

  test("this same site (the page navigating to itself) is not a referral", () => {
    expect(externalReferrer(page, page)).toBe("");
    expect(externalReferrer("http://localhost:5173/termsofuse", page)).toBe("");
  });

  test('none, or not a URL → ""', () => {
    expect(externalReferrer("", page)).toBe("");
    expect(externalReferrer(undefined, page)).toBe("");
    expect(externalReferrer("not a url", page)).toBe("");
  });
});

describe("formFieldsRequestBody", () => {
  test("env, url, non-empty utm_* and userAgent — like the old web component", () => {
    expect(formFieldsRequestBody("test", PAGE)).toEqual({
      env: "test",
      url: PAGE.href,
      utm_source: "x",
      userAgent: "UA",
    });
  });
});

describe("isAccepted / postEntry", () => {
  test("accepts success: true, or statusCode 200 when success is absent", () => {
    expect(isAccepted({ success: true, statusCode: 200 })).toBe(true);
    expect(isAccepted({ statusCode: 200 })).toBe(true);
  });

  test("rejects success: false even with statusCode 200", () => {
    expect(isAccepted({ success: false, statusCode: 200 })).toBe(false);
    expect(isAccepted({ statusCode: 400 })).toBe(false);
    expect(isAccepted(undefined)).toBe(false);
  });

  test("POSTs JSON to the URL", async () => {
    const fetchMock = answer(200, { statusCode: 200, data: {} });
    expect(await postEntry(SUBMIT, { email: "a@b.co" }, fetchMock)).toEqual({ ok: true });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe(SUBMIT);
    expect(init.method).toBe("POST");
    expect(init.headers).toEqual({ "Content-Type": "application/json" });
    expect(JSON.parse(init.body as string)).toEqual({ email: "a@b.co" });
  });

  test("{ success: false, statusCode: 200 } → refused", async () => {
    const fetchMock = answer(200, { success: false, statusCode: 200, error: { detail: "No" } });
    expect(await postEntry(SUBMIT, {}, fetchMock)).toEqual({ ok: false, detail: "No" });
  });

  test("HTTP error → refused with the service's detail", async () => {
    const fetchMock = answer(403, { success: false, error: { detail: "Invalid origin" } });
    expect(await postEntry(SUBMIT, {}, fetchMock)).toEqual({ ok: false, detail: "Invalid origin" });
  });

  test("2xx with a non-JSON body → refused", async () => {
    const fetchMock = vi.fn(async () => new Response("oops", { status: 200 }));
    expect(await postEntry(SUBMIT, {}, fetchMock)).toEqual({ ok: false, detail: "" });
  });

  test("network error → refused, no throw", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await postEntry(SUBMIT, {}, fetchMock)).toEqual({ ok: false, detail: "" });
  });
});

describe("refusalMessage", () => {
  const limit = "Sorry, you reached the entry limit for this category.";
  const shown = {
    [limit]: "Lo sentimos, has alcanzado el límite de participaciones para esta categoría.",
  };
  const fallback = "Gracias por tu paciencia; por favor, intenta participar de nuevo.";

  test("a listed message from the service shows its text", () => {
    expect(refusalMessage(limit, shown, fallback)).toBe(shown[limit]);
  });

  test("any other message, or none, shows the fallback", () => {
    expect(refusalMessage("Invalid origin", shown, fallback)).toBe(fallback);
    expect(refusalMessage("toString", shown, fallback)).toBe(fallback);
    expect(refusalMessage("", shown, fallback)).toBe(fallback);
    expect(refusalMessage("", {}, fallback)).toBe(fallback);
  });
});

describe("useEntrySubmission", () => {
  const make = (fetchImpl: typeof fetch, now = () => 0) =>
    useEntrySubmission({
      submitUrl: SUBMIT,
      formFieldsUrl: FIELDS,
      env: "test",
      fetchImpl,
      now,
      page: () => PAGE,
    });

  test("prepare() (on mount) asks get-form-fields with the old body", async () => {
    const fetchMock = router();
    await make(fetchMock).prepare();
    const calls = callsTo(fetchMock, FIELDS);
    expect(calls).toHaveLength(1);
    expect(calls[0][1].method).toBe("POST");
    expect(JSON.parse(calls[0][1].body as string)).toEqual(formFieldsRequestBody("test", PAGE));
  });

  test("devForm goes in the submission body, without asking again", async () => {
    const fetchMock = router({ tokens: ["tok-1"] });
    const s = make(fetchMock);
    await s.prepare();
    expect(await s.submit({ email: "a@b.co" })).toBe(true);
    const [, init] = callsTo(fetchMock, SUBMIT)[0];
    expect(JSON.parse(init.body as string)).toEqual({ email: "a@b.co", devForm: "tok-1" });
    expect(callsTo(fetchMock, FIELDS)).toHaveLength(1);
  });

  test("a devForm older than 9 minutes is asked for again before sending", async () => {
    let clock = 0;
    const fetchMock = router({ tokens: ["old", "new"] });
    const s = make(fetchMock, () => clock);
    await s.prepare();
    clock = DEV_FORM_MAX_AGE_MS + 1;
    expect(await s.submit({})).toBe(true);
    expect(callsTo(fetchMock, FIELDS)).toHaveLength(2);
    expect(JSON.parse(callsTo(fetchMock, SUBMIT)[0][1].body as string)).toEqual({ devForm: "new" });
  });

  test("the campaign's dates come from that same answer: one request on mount", async () => {
    const fetchMock = router();
    const s = make(fetchMock);
    void s.prepare();
    expect(await s.campaignDates).toMatchObject({
      ok: true,
      dates: { start: Date.parse("2026-10-05T22:22:00Z"), endMessage: "Over" },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("without an answer there are no dates (the form stays closed)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const s = make(router({ fieldsFail: true }));
    await s.prepare();
    expect(await s.campaignDates).toEqual({ ok: false, reason: "network error" });
    warn.mockRestore();
  });

  test("cancel() aborts the get-form-fields request still pending", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    let signal: AbortSignal | undefined;
    const pending = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_, reject) => {
          signal = init.signal!;
          signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const s = make(pending as unknown as typeof fetch);
    const prepared = s.prepare();
    s.cancel();
    await prepared;
    expect(signal?.aborted).toBe(true);
    warn.mockRestore();
  });

  test("no formFieldsUrl: no request and no dates", () => {
    const s = useEntrySubmission({ submitUrl: SUBMIT, env: "test", fetchImpl: router() });
    expect(s.campaignDates).toBeNull();
  });

  test("if devForm can't be had, the entry is still sent (without it)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = router({ fieldsFail: true });
    const s = make(fetchMock);
    await s.prepare();
    expect(await s.submit({ email: "a@b.co" })).toBe(true);
    expect(JSON.parse(callsTo(fetchMock, SUBMIT)[0][1].body as string)).toEqual({
      email: "a@b.co",
    });
    warn.mockRestore();
  });

  test("idle → sending → sent, and refuses a second send", async () => {
    const fetchMock = router();
    const s = make(fetchMock);
    expect(s.state.value).toBe("idle");
    const pending = s.submit({});
    expect(s.state.value).toBe("sending");
    expect(await s.submit({})).toBe(false); // ignored while sending
    expect(await pending).toBe(true);
    expect(s.state.value).toBe("sent");
    expect(await s.submit({})).toBe(false); // ignored after success
    expect(callsTo(fetchMock, SUBMIT)).toHaveLength(1);
  });

  test("error keeps the service's detail and allows retrying", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(500, { success: false, error: { detail: "Down" } }))
      .mockResolvedValueOnce(json(200, { success: true }));
    const s = useEntrySubmission({ submitUrl: SUBMIT, env: "test", fetchImpl: fetchMock });
    expect(await s.submit({})).toBe(false);
    expect(s.state.value).toBe("error");
    expect(s.errorDetail.value).toBe("Down");
    expect(await s.submit({})).toBe(true);
    expect(s.state.value).toBe("sent");
    expect(s.errorDetail.value).toBe("");
    warn.mockRestore();
  });
});

describe("ensureModuleScript", () => {
  /** Minimal stand-in for `document` (no DOM in the test runner). */
  function fakeDocument() {
    const appended: Record<string, string>[] = [];
    const doc = {
      head: { appendChild: (node: Record<string, string>) => appended.push(node) },
      getElementById: (id: string) => appended.find((n) => n.id === id) ?? null,
      createElement: () => ({}) as Record<string, string>,
    };
    return { doc: doc as unknown as Document, appended };
  }

  test("adds one module script to <head>, only once", () => {
    const { doc, appended } = fakeDocument();
    const src = "https://universal-form.onprobability.com/v1/dist/index.js";
    ensureModuleScript(doc, src, "uf-v1");
    ensureModuleScript(doc, src, "uf-v1");
    expect(appended).toEqual([{ type: "module", src, id: "uf-v1" }]);
  });

  test("with an SRI hash the script is fetched in CORS mode and checked", () => {
    const { doc, appended } = fakeDocument();
    const src = "https://universal-form.onprobability.com/v1.2.3/dist/index.js";
    ensureModuleScript(doc, src, "uf-v1", "sha384-abc");
    expect(appended).toEqual([
      { type: "module", src, id: "uf-v1", integrity: "sha384-abc", crossOrigin: "anonymous" },
    ]);
  });
});
