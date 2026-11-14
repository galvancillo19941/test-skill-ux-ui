import { describe, expect, test } from "vite-plus/test";
import rawConfig from "../../content/config.json";
import { siteConfigSchema } from "./schema.ts";

const siteConfig = rawConfig as Record<string, any>;

/** Deep copy so each case can break the config without touching the others. */
const clone = () => structuredClone(siteConfig);
const passes = (config: unknown) => siteConfigSchema.safeParse(config).success;

describe("content/config.json (Universal Form v1, page submits)", () => {
  test("passes the schema with the v1 form and the contest submission URLs", () => {
    const result = siteConfigSchema.safeParse(siteConfig);
    expect(result.success).toBe(true);
    expect(result.data?.environments.test.submitUrl).toBe(
      "https://api.helloprobability.io/submission/test/6ac016a105927c4e9b5bc570",
    );
    expect(result.data?.environments.prod.submitUrl).toBe(
      "https://api.helloprobability.io/submission/prod/6ac016a105927c4e9b5bc570",
    );
    expect(result.data?.form.universalV1?.scriptUrl).toBe(
      "https://universal-form.onprobability.com/v1/releases/1.0.0/index.js",
    );
    expect(result.data?.form.universalV1?.scriptIntegrity).toMatch(/^sha384-/);
  });

  test("has the 11 contest fields in the Figma order, all required", () => {
    const fields = siteConfigSchema.parse(siteConfig).form.universalV1.config.fields;
    expect(fields.map((f) => f.name)).toEqual([
      "entry_category",
      "first_name",
      "last_name",
      "email",
      "country",
      "city",
      "state",
      "license_request_type",
      "creator_id",
      "experience_id_url",
      "p_i_confirm_i_am_a_legal_resident_of_eit",
    ]);
    expect(fields.every((f) => f.required)).toBe(true);
    expect(fields.find((f) => f.name === "entry_category")!.options).toEqual([
      { label: "Full Game", value: "full_game" },
      { label: "Game Integration", value: "game_integration" },
      { label: "UGC Item", value: "new_item" },
    ]);
    expect(fields.find((f) => f.name === "license_request_type")!.options![0]).toEqual({
      label: "UGC Item",
      value: "ugc",
    });
    const state = fields.find((f) => f.name === "state")!;
    expect(state.options).toHaveLength(51 + 13 + 32); // U.S. (50 + DC), Canada, Mexico
    expect(state.options).toContainEqual({
      label: "District Of Columbia",
      value: "district_of_columbia",
    });
  });

  test("fails without fields (missing or empty)", () => {
    const missing = clone();
    delete missing.form.universalV1.config.fields;
    expect(passes(missing)).toBe(false);

    const empty = clone();
    empty.form.universalV1.config.fields = [];
    expect(passes(empty)).toBe(false);
  });

  test("fails without a submitUrl or with an invalid one", () => {
    const missing = clone();
    delete missing.environments.test.submitUrl;
    expect(passes(missing)).toBe(false);

    for (const bad of [
      "not a url",
      "ftp://api.helloprobability.io/x",
      "http://api.helloprobability.io/submission/test/6ac016a105927c4e9b5bc570",
      "",
    ]) {
      const config = clone();
      config.environments.test.submitUrl = bad;
      expect(passes(config)).toBe(false);
    }
  });

  test("each environment's submitUrl targets that environment (no real entries to test, or vice versa)", () => {
    const swapped = clone();
    swapped.environments.prod.submitUrl = swapped.environments.test.submitUrl;
    expect(passes(swapped)).toBe(false);

    const testToProd = clone();
    testToProd.environments.test.submitUrl = testToProd.environments.prod.submitUrl;
    expect(passes(testToProd)).toBe(false);

    const noProd = clone();
    delete noProd.environments.prod;
    expect(passes(noProd)).toBe(false);
  });

  test("siteUrl is optional, https and an origin only", () => {
    for (const [url, ok] of [
      ["https://www.example.com", true],
      ["https://www.example.com/", false],
      ["https://www.example.com/contest", false],
      ["http://www.example.com", false],
    ] as const) {
      const config = clone();
      config.environments.prod.siteUrl = url;
      expect(passes(config)).toBe(ok);
    }
  });

  test("scriptUrl is https; scriptIntegrity, when set, is an SRI hash", () => {
    const http = clone();
    http.form.universalV1.scriptUrl = "http://universal-form.onprobability.com/v1/dist/index.js";
    expect(passes(http)).toBe(false);

    const sri = clone();
    sri.form.universalV1.scriptIntegrity =
      "sha384-oqVuAfXRKap7fdgcCY5uykM6+R9GqQ8K/uxy9rx7HNQlGYl1kPzQho1wx4JwY8wC";
    expect(passes(sri)).toBe(true);
    sri.form.universalV1.scriptIntegrity = "md5-abc";
    expect(passes(sri)).toBe(false);
  });

  test("validate rules: creator_id and experience_id_url have one; a bad pattern fails", () => {
    const fields = siteConfigSchema.parse(siteConfig).form.universalV1.config.fields;
    expect(fields.filter((f) => f.validate).map((f) => f.name)).toEqual([
      "creator_id",
      "experience_id_url",
    ]);
    // Creator ID: exactly 9 digits, and no 10th can be typed.
    expect(fields.find((f) => f.name === "creator_id")!.validate).toMatchObject({
      pattern: "[0-9]{9}",
      maxLength: 9,
    });
    const bad = clone();
    Object.assign(bad.form.universalV1.config.fields[8]!, {
      validate: { pattern: "([0-9]", message: "Numbers only." },
    });
    expect(passes(bad)).toBe(false);
  });

  test("formFieldsUrl is optional but must be https when set", () => {
    const missing = clone();
    delete missing.form.universalV1.formFieldsUrl;
    expect(passes(missing)).toBe(true);

    const http = clone();
    http.form.universalV1.formFieldsUrl =
      "http://api.helloprobability.io/service/get-form-fields/6ac016a105927c4e9b5bc570";
    expect(passes(http)).toBe(false);
  });

  test("fails without the universalV1 block", () => {
    const config = clone();
    delete config.form.universalV1;
    expect(passes(config)).toBe(false);
  });

  test("fails on an unknown field type, a select without options, or a duplicated name", () => {
    const badType = clone();
    badType.form.universalV1.config.fields[1].type = "dropdown";
    expect(passes(badType)).toBe(false);

    const noOptions = clone();
    delete noOptions.form.universalV1.config.fields[0].options;
    expect(passes(noOptions)).toBe(false);

    const dup = clone();
    dup.form.universalV1.config.fields[2].name = "first_name";
    expect(passes(dup)).toBe(false);
  });

  test("legend off, and 4 sections that cover every field exactly once", () => {
    const v1 = siteConfigSchema.parse(siteConfig).form.universalV1;
    expect(Object.keys(v1.config.i18n!)).toEqual(["en", "es", "fr"]);
    for (const dictionary of Object.values(v1.config.i18n!)) {
      expect(dictionary).toMatchObject({ requiredLegend: "" });
    }
    expect(v1.sections!.map((s) => s.id)).toEqual([
      "category",
      "about-you",
      "about-content",
      "consent",
    ]);
    expect(v1.sections!.flatMap((s) => s.fields).sort()).toEqual(
      v1.config.fields.map((f) => f.name).sort(),
    );
    expect(v1.sections![0].titleHtml).toContain("Entry Category");
  });

  test("no skeleton anywhere in the default; columns come from CSS (2 / 1)", () => {
    const v1 = siteConfigSchema.parse(siteConfig).form.universalV1;
    expect(v1.skeleton).toBeUndefined();
    expect(v1.sections!.map((s) => s.columns)).toEqual([1, 2, 2, 1]);
    expect(JSON.stringify(siteConfig)).not.toContain("skeleton");
  });

  test("loader messages: the default's, and defaults when omitted", () => {
    const v1 = siteConfigSchema.parse(siteConfig).form.universalV1;
    expect(v1.messages.loading).toBe("LOADING…");
    expect(v1.messages.retry).toBe("Try again");
    const config = clone();
    delete config.form.universalV1.messages;
    const parsed = siteConfigSchema.parse(config).form.universalV1;
    expect(parsed.messages).toMatchObject({ loading: "Loading…", retry: "Try again" });
  });

  test("without sections the form is a single one, as before", () => {
    const config = clone();
    delete config.form.universalV1.sections;
    // The dictionaries translate the sections' titles, which are gone with them.
    for (const dictionary of Object.values<any>(config.i18n)) delete dictionary.form.sections;
    expect(passes(config)).toBe(true);
  });

  test("sections: a field in two sections, unassigned, unknown or a repeated id fails", () => {
    const twice = clone();
    twice.form.universalV1.sections[1].fields.push("entry_category");
    expect(passes(twice)).toBe(false);

    const unassigned = clone();
    unassigned.form.universalV1.sections[1].fields.pop();
    expect(passes(unassigned)).toBe(false);

    const unknown = clone();
    unknown.form.universalV1.sections[1].fields[0] = "nope";
    expect(passes(unknown)).toBe(false);

    const dupId = clone();
    dupId.form.universalV1.sections[1].id = "category";
    expect(passes(dupId)).toBe(false);

    const empty = clone();
    empty.form.universalV1.sections[3].fields = [];
    expect(passes(empty)).toBe(false);
  });

  test("fails on a field property the v1 bundle doesn't read (no invented props)", () => {
    const config = clone();
    config.form.universalV1.config.fields[0].description = "x";
    expect(passes(config)).toBe(false);
  });
});

describe("documents", () => {
  test("rules and terms of use (EN, ES, FR), each at its own path", () => {
    const docs = siteConfigSchema.parse(siteConfig).documents;
    expect(docs.map((d) => [d.path, d.lang])).toEqual([
      ["/rules", "en"],
      ["/rules-es", "es"],
      ["/rules-fr", "fr"],
      ["/termsofuse", "en"],
      ["/termsofuse-es", "es"],
      ["/termsofuse-fr", "fr"],
    ]);
    expect(docs.find((d) => d.path === "/termsofuse")?.file).toBe("docs/terms-of-use.pdf");
  });

  test("the consent checkbox links each language to its rules and terms of use", () => {
    const config = siteConfigSchema.parse(siteConfig);
    const consent = "p_i_confirm_i_am_a_legal_resident_of_eit";
    const label = (locale: string): string =>
      locale === config.lang
        ? config.form.universalV1.config.fields.find((f) => f.name === consent)!.labelHtml!
        : (config.i18n[locale] as any).form.fields[consent].labelHtml;
    expect(label("en")).toContain('href="/rules"');
    expect(label("fr")).toContain('href="/rules-fr"');
    expect(label("es")).toContain('href="/rules-es"');
    expect(label("en")).toContain('href="/termsofuse"');
    expect(label("es")).toContain('href="/termsofuse-es"');
    expect(label("fr")).toContain('href="/termsofuse-fr"');
    expect(label("en")).toContain("Contest Global Terms of Use and Privacy Policy");
  });

  test("fails on a shared path, a nested path or a file that isn't a PDF in docs/", () => {
    const shared = clone();
    shared.documents[1].path = "/rules";
    expect(passes(shared)).toBe(false);

    const nested = clone();
    nested.documents[0].path = "/rules/en";
    expect(passes(nested)).toBe(false);

    const notPdf = clone();
    notPdf.documents[0].file = "img/lockup.svg";
    expect(passes(notPdf)).toBe(false);
  });
});

describe("defaults", () => {
  test("optional fields default: no eyebrow, no thank-you swap, a generic error page", () => {
    const minimal = clone();
    delete minimal.hero.eyebrow;
    delete minimal.thankYou;
    delete minimal.errorPage;
    const parsed = siteConfigSchema.parse(minimal);
    expect(parsed.hero.eyebrow).toBe("");
    expect(parsed.thankYou).toEqual({ titleHtml: "", paragraphsHtml: [] });
    expect(parsed.errorPage.title).toBe("Page not found");
  });
});
