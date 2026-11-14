import { describe, expect, test, vi } from "vite-plus/test";
import {
  collectValues,
  fieldOrder,
  sectionConfig,
  submitSections,
  validateAll,
  type SectionForm,
} from "./sectionedForm.ts";

const form = (valid: boolean, values: Record<string, unknown> = {}) => ({
  validateStep: vi.fn(() => valid),
  values,
});

describe("collectValues", () => {
  test("merges the values of several sections, keys in the given order", () => {
    const values = collectValues(
      ["a", "b", "c", "d"],
      [
        { c: "3", a: "1" },
        { d: "4", b: "2" },
      ],
    );
    expect(Object.keys(values)).toEqual(["a", "b", "c", "d"]);
    expect(values).toEqual({ a: "1", b: "2", c: "3", d: "4" });
  });

  test("a field nobody touched is an empty string", () => {
    expect(collectValues(["a", "b"], [{ a: "1" }])).toEqual({ a: "1", b: "" });
  });
});

describe("validateAll", () => {
  test("validates EVERY section even after one fails, and returns the failed indexes", () => {
    const forms = [form(false), form(true), form(false)];
    expect(validateAll(forms)).toEqual([0, 2]);
    for (const f of forms) expect(f.validateStep).toHaveBeenCalledTimes(1);
  });

  test("none failed → empty", () => {
    expect(validateAll([form(true), form(true)])).toEqual([]);
  });
});

describe("submitSections", () => {
  test("any section invalid → nothing is sent, all were validated", async () => {
    const send = vi.fn(async () => true);
    const forms = [form(true), form(false), form(false)];
    const result = await submitSections({ forms, order: ["a"], send });
    expect(result).toEqual({ status: "invalid", invalid: [1, 2] });
    expect(send).not.toHaveBeenCalled();
    for (const f of forms) expect(f.validateStep).toHaveBeenCalled();
  });

  test("all valid → ONE send with the merged values in order", async () => {
    const send = vi.fn(async (_values: Record<string, unknown>) => true);
    const forms: SectionForm[] = [form(true, { b: "2" }), form(true, { a: "1" })];
    const result = await submitSections({ forms, order: ["a", "b"], send });
    expect(result).toEqual({ status: "sent" });
    expect(send).toHaveBeenCalledTimes(1);
    expect(Object.entries(send.mock.calls[0]![0])).toEqual([
      ["a", "1"],
      ["b", "2"],
    ]);
  });

  test("the page's check runs even when a section is invalid, and a failed check stops the send", async () => {
    const send = vi.fn(async () => true);
    const check = vi.fn(() => false);
    const withInvalid = await submitSections({ forms: [form(false)], order: [], check, send });
    expect(withInvalid).toEqual({ status: "invalid", invalid: [0] });
    expect(check).toHaveBeenCalledTimes(1);
    const allValid = await submitSections({
      forms: [form(true, { a: "x" })],
      order: ["a"],
      check,
      send,
    });
    expect(allValid).toEqual({ status: "invalid", invalid: [] });
    expect(check).toHaveBeenLastCalledWith({ a: "x" });
    expect(send).not.toHaveBeenCalled();
  });

  test("a refused send → failed", async () => {
    const result = await submitSections({
      forms: [form(true)],
      order: [],
      send: async () => false,
    });
    expect(result).toEqual({ status: "failed" });
  });
});

describe("sectionConfig", () => {
  const base = {
    fields: [
      { name: "a", type: "text", label: "A", required: true },
      { name: "b", type: "text", label: "B", required: true },
      { name: "c", type: "text", label: "C", required: true },
    ],
    locale: "en",
    i18n: { en: { requiredLegend: "" } },
  } as never;

  test("one step, no nav, only the section's fields in its order", () => {
    const config = sectionConfig(base, { id: "s", titleHtml: "", fields: ["c", "a"], columns: 1 });
    expect(config.steps).toHaveLength(1);
    expect(config.steps[0]!.hideNav).toBe(true);
    expect(config.steps[0]!.fields.map((f) => f.name)).toEqual(["c", "a"]);
    expect(config.locale).toBe("en");
    expect(config.i18n).toEqual({ en: { requiredLegend: "" } });
  });

  test("fieldOrder follows config.fields", () => {
    expect(fieldOrder(base)).toEqual(["a", "b", "c"]);
  });
});
