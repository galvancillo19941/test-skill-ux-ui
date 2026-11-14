import { describe, expect, test } from "vite-plus/test";
import rawConfig from "../../content/config.json";
import {
  copySlots,
  dictionaryIssues,
  languages,
  localize,
  savedLocale,
  siteLocales,
} from "./i18n.ts";
import { siteConfigSchema } from "./schema.ts";

const config = siteConfigSchema.parse(rawConfig);
const clone = () => structuredClone(rawConfig) as Record<string, any>;
const issuesOf = (raw: unknown) => {
  const result = siteConfigSchema.safeParse(raw);
  return result.success ? [] : result.error.issues.map((i) => i.path.join("."));
};
const field = (c: typeof config, name: string) =>
  c.form.universalV1.config.fields.find((f) => f.name === name)!;

describe("languages (content/config.json)", () => {
  test("English (the base), Spanish and French, each named in itself", () => {
    expect(siteLocales(config)).toEqual(["en", "es", "fr"]);
    expect(languages(config)).toEqual([
      { locale: "en", code: "EN", name: "English" },
      { locale: "es", code: "ES", name: "Español" },
      { locale: "fr", code: "FR", name: "Français" },
    ]);
  });

  test("every dictionary translates every text of the base copy", () => {
    for (const locale of ["es", "fr"]) {
      expect(dictionaryIssues(config, config.i18n[locale]!)).toEqual([]);
    }
  });

  test("English until the menu picks another; the pick is kept while the site speaks it", () => {
    expect(savedLocale(config, null)).toBe("en");
    expect(savedLocale(config, "es")).toBe("es");
    expect(savedLocale(config, "fr")).toBe("fr");
    expect(savedLocale(config, "de")).toBe("en");
    expect(savedLocale(config, "")).toBe("en");
  });
});

describe("localize", () => {
  test("Spanish: the client's copy, error messages and options", () => {
    const es = localize(config, "es");
    expect(es.hero.eyebrow).toBe("CONCURSO PARA CREADORES");
    expect(field(es, "first_name").errorMessage).toBe("Por favor introduce tu Nombre");
    expect(field(es, "p_i_confirm_i_am_a_legal_resident_of_eit").errorMessage).toBe(
      "Debes aceptar para continuar",
    );
    expect(field(es, "country").options).toEqual([
      { label: "EE. UU.", value: "u.s." },
      { label: "Canadá", value: "canada" },
      { label: "México", value: "mexico" },
    ]);
    expect(field(es, "experience_id_url").dependsOn?.textWhen.new_item?.label).toBe(
      "URL DEL UGC ITEM",
    );
    expect(es.form.universalV1.sections![0]!.titleHtml).toContain("Categoría de Inscripción");
    expect(es.form.universalV1.config.submit?.label).toBe("ENVIAR");
  });

  test("only the words change: names, values, rules and endpoints stay", () => {
    const fr = localize(config, "fr");
    const shape = (c: typeof config) =>
      c.form.universalV1.config.fields.map((f) => ({
        name: f.name,
        type: f.type,
        required: f.required,
        values: f.options?.map((o) => o.value),
        pattern: f.validate?.pattern,
        source: f.dependsOn?.field,
      }));
    expect(shape(fr)).toEqual(shape(config));
    expect(fr.environments).toEqual(config.environments);
    // Options a dictionary leaves out keep the base label (the U.S. states).
    expect(field(fr, "state").options!.slice(0, 51)).toEqual(
      field(config, "state").options!.slice(0, 51),
    );
    expect(field(fr, "state").options).toContainEqual({ label: "Québec", value: "quebec" });
  });

  test("refusal messages in each language", () => {
    const limit = "Sorry, you reached the entry limit for this category.";
    const refusals = (locale: string) => {
      const v1 = localize(config, locale).form.universalV1;
      return [v1.shownErrors[limit], v1.messages.error];
    };
    expect(refusals("en")).toEqual([
      "Sorry, you reached the entry limit for this category.",
      "Thank you for your patience, please try again to enter.",
    ]);
    expect(refusals("es")).toEqual([
      "Lo sentimos, has alcanzado el límite de participaciones para esta categoría.",
      "Gracias por tu paciencia; por favor, intenta participar de nuevo.",
    ]);
    expect(refusals("fr")).toEqual([
      "Désolé, vous avez atteint la limite de participations pour cette catégorie.",
      "Merci de votre patience ; veuillez réessayer de participer.",
    ]);
  });

  test("v1's own words follow the page's language; the base config is untouched", () => {
    expect(localize(config, "fr").form.universalV1.config.locale).toBe("fr");
    expect(localize(config, "en").form.universalV1.config.locale).toBe("en");
    expect(config.hero.eyebrow).toBe("CREATOR CONTEST");
  });

  test("a language with no dictionary is a build error", () => {
    expect(() => localize(config, "de")).toThrow(/no "de" dictionary/);
  });
});

describe("i18n in the schema", () => {
  test("a missing translation fails, naming the key", () => {
    const raw = clone();
    delete raw.i18n.es.form.fields.city.errorMessage;
    expect(issuesOf(raw)).toEqual(["i18n.es.form.fields.city.errorMessage"]);
  });

  test("a key that translates nothing fails (typos, removed fields)", () => {
    const raw = clone();
    raw.i18n.fr.form.fields.citty = { label: "VILLE" };
    raw.i18n.fr.hero.title = "X";
    expect(issuesOf(raw).sort()).toEqual(["i18n.fr.form.fields.citty.label", "i18n.fr.hero.title"]);
  });

  test("a list stays a list, a text a text", () => {
    const raw = clone();
    raw.i18n.es.hero.paragraphsHtml = "uno";
    expect(issuesOf(raw)).toEqual(["i18n.es.hero.paragraphsHtml"]);
  });

  test("the base language has no dictionary, and tags are language tags", () => {
    const base = clone();
    base.i18n.en = {};
    expect(issuesOf(base)).toEqual(["i18n.en"]);
    const bad = clone();
    bad.i18n["es mx"] = bad.i18n.es;
    expect(issuesOf(bad)).toContain("i18n.es mx");
  });

  test("option labels are optional; empty base texts need no translation", () => {
    const keys = copySlots(config)
      .filter((s) => s.optional)
      .map((s) => s.key.join("."));
    expect(keys).toContain("form.fields.state.options.texas");
    expect(keys).toContain("form.intro.title");
    expect(keys).not.toContain("form.fields.state.label");
  });
});
