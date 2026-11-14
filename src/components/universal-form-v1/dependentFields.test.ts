import { describe, expect, test } from "vite-plus/test";
import rawConfig from "../../../content/config.json";
import { siteConfigSchema, universalFormV1Schema } from "../../site/schema.ts";
import { dependencySources, resolveFields, withoutHidden } from "./dependentFields.ts";

const fields = siteConfigSchema.parse(rawConfig).form.universalV1.config.fields;
const names = (r: ReturnType<typeof resolveFields>) => r.fields.map((f) => f.name);
const optionsOf = (r: ReturnType<typeof resolveFields>, name: string) =>
  r.fields.find((f) => f.name === name)?.options?.map((o) => o.value);

describe("resolveFields (content/config.json)", () => {
  test("entry_category and country are the sources", () => {
    expect([...dependencySources(fields)].sort()).toEqual(["country", "entry_category"]);
  });

  test("State: shown but disabled until a country is picked, then only that country's list", () => {
    const none = resolveFields(fields, {});
    expect(names(none)).toContain("state");
    expect(none.disabled).toContain("state");
    const lists = { "u.s.": 51, canada: 13, mexico: 32 };
    for (const [country, count] of Object.entries(lists)) {
      const r = resolveFields(fields, { country });
      expect(r.disabled).not.toContain("state");
      expect(r.fields.find((f) => f.name === "state")?.required).toBe(true);
      expect(optionsOf(r, "state")).toHaveLength(count);
    }
    expect(optionsOf(resolveFields(fields, { country: "canada" }), "state")).toContain("quebec");
    expect(optionsOf(resolveFields(fields, { country: "mexico" }), "state")).toContain("jalisco");
    expect(optionsOf(resolveFields(fields, { country: "mexico" }), "state")).not.toContain("texas");
    // Only the 50 states and D.C.: no overseas territories.
    expect(optionsOf(resolveFields(fields, { country: "u.s." }), "state")).not.toContain("guam");
  });

  test("changing the country clears a state that isn't in its list", () => {
    expect(resolveFields(fields, { country: "mexico", state: "texas" }).clear).toEqual(["state"]);
    expect(resolveFields(fields, { country: "u.s.", state: "texas" }).clear).toEqual([]);
  });

  test("no category or country yet: license and state shown but disabled, all options", () => {
    const r = resolveFields(fields, {});
    expect(r.disabled).toEqual(["state", "license_request_type"]);
    expect(optionsOf(r, "license_request_type")).toEqual(["ugc", "time-limited", "perpetual"]);
    expect(r.clear).toEqual([]);
    expect(r.fields.filter((f) => !f.required).map((f) => f.name)).toEqual(r.disabled);
  });

  test("once enabled they are required again", () => {
    const r = resolveFields(fields, { entry_category: "full_game", country: "u.s." });
    expect(r.fields.every((f) => f.required)).toBe(true);
  });

  test("new item: only UGC, every field drawn, nothing disabled", () => {
    const r = resolveFields(fields, { entry_category: "new_item", country: "u.s." });
    expect(optionsOf(r, "license_request_type")).toEqual(["ugc"]);
    expect(names(r)).toEqual(fields.map((f) => f.name));
    expect(r.disabled).toEqual([]);
  });

  test("the link's label and error follow the category", () => {
    const link = (category?: string) =>
      resolveFields(fields, category ? { entry_category: category } : {}).fields.find(
        (f) => f.name === "experience_id_url",
      );
    expect(link()?.label).toBe("EXPERIENCE URL");
    expect(link("new_item")).toMatchObject({
      label: "UGC ITEM URL",
      errorMessage: "Please enter a valid UGC Item URL",
    });
    for (const category of ["game_integration", "full_game"]) {
      expect(link(category)).toMatchObject({
        label: "GAME URL",
        errorMessage: "Please enter a valid Game URL",
      });
    }
    expect(fields.find((f) => f.name === "experience_id_url")?.label).toBe("EXPERIENCE URL");
  });

  test("other categories: every option but UGC", () => {
    for (const category of ["game_integration", "full_game"]) {
      const r = resolveFields(fields, {
        entry_category: category,
        country: "u.s.",
        license_request_type: "ugc",
      });
      expect(optionsOf(r, "license_request_type")).toEqual(["time-limited", "perpetual"]);
      expect(r.clear).toEqual(["license_request_type"]);
      expect(r.disabled).toEqual([]);
    }
  });

  test("switching to new item clears values that no longer apply", () => {
    const r = resolveFields(fields, {
      entry_category: "new_item",
      license_request_type: "perpetual",
    });
    expect(r.clear).toEqual(["license_request_type"]);
    expect(
      resolveFields(fields, { entry_category: "new_item", license_request_type: "ugc" }).clear,
    ).toEqual([]);
  });

  test("dependsOn, validate and noteHtml never reach v1", () => {
    expect(fields.some((f) => f.noteHtml)).toBe(true);
    const drawn = resolveFields(fields, {}).fields;
    expect(drawn.some((f) => "dependsOn" in f || "validate" in f || "noteHtml" in f)).toBe(false);
  });
});

describe("hiddenWhen", () => {
  const fields = universalFormV1Schema.parse({
    config: {
      fields: [
        {
          name: "a",
          type: "select",
          label: "A",
          options: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
          ],
        },
        { name: "b", type: "text", label: "B", dependsOn: { field: "a", hiddenWhen: ["1"] } },
        { name: "c", type: "text", label: "C" },
      ],
    },
  }).config.fields;

  test("a hidden field is not drawn, its value is cleared", () => {
    const r = resolveFields(fields, { a: "1", b: "x" });
    expect(names(r)).toEqual(["a", "c"]);
    expect(r.clear).toEqual(["b"]);
  });

  test("a hidden field is not sent at all", () => {
    const values = { a: "1", b: "", c: "1" };
    expect(withoutHidden(values, fields, resolveFields(fields, values))).toEqual({
      a: "1",
      c: "1",
    });
    const full = { ...values, a: "2" };
    expect(withoutHidden(full, fields, resolveFields(fields, full))).toEqual(full);
  });
});

describe("shownWhen", () => {
  const fields = universalFormV1Schema.parse({
    config: {
      fields: [
        {
          name: "a",
          type: "select",
          label: "A",
          options: [
            { label: "1", value: "1" },
            { label: "2", value: "2" },
          ],
        },
        {
          name: "b",
          type: "text",
          label: "B",
          required: true,
          dependsOn: { field: "a", shownWhen: ["1"] },
        },
      ],
    },
  }).config.fields;

  test("shown (and required) only for those values; hidden while empty or another", () => {
    expect(names(resolveFields(fields, { a: "1" }))).toEqual(["a", "b"]);
    expect(resolveFields(fields, { a: "1" }).fields[1]?.required).toBe(true);
    expect(names(resolveFields(fields, {}))).toEqual(["a"]);
    const other = resolveFields(fields, { a: "2", b: "x" });
    expect(names(other)).toEqual(["a"]);
    expect(other.clear).toEqual(["b"]);
  });
});

describe("dependsOn schema", () => {
  const base = {
    form: {
      universalV1: {
        config: {
          fields: [
            { name: "a", type: "select", label: "A", options: [{ label: "1", value: "1" }] },
            {
              name: "b",
              type: "select",
              label: "B",
              options: [{ label: "1", value: "1" }],
              dependsOn: { field: "a", optionsWhen: { "1": ["nope"] } },
            },
          ],
        },
      },
    },
  };

  test("rejects an option that is not the field's", () => {
    const ok = structuredClone(base);
    ok.form.universalV1.config.fields[1]!.dependsOn!.optionsWhen = { "1": ["1"] };
    expect(universalFormV1Schema.safeParse(ok.form.universalV1).success).toBe(true);
    expect(universalFormV1Schema.safeParse(base.form.universalV1).success).toBe(false);
  });

  test("rejects a hiddenWhen / shownWhen value that the source field doesn't offer", () => {
    for (const rule of [{ shownWhen: ["us"] }, { hiddenWhen: ["us"] }]) {
      const bad = structuredClone(base);
      bad.form.universalV1.config.fields[1]!.dependsOn = { field: "a", ...rule } as never;
      expect(universalFormV1Schema.safeParse(bad.form.universalV1).success).toBe(false);
    }
    const ok = structuredClone(base);
    ok.form.universalV1.config.fields[1]!.dependsOn = { field: "a", shownWhen: ["1"] } as never;
    expect(universalFormV1Schema.safeParse(ok.form.universalV1).success).toBe(true);
  });
});
