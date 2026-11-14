import type { Dictionary, SiteConfig } from "./schema.ts";

/**
 * The site in several languages, the way Universal Form does it: the
 * dictionaries travel inline in the config (`i18n` in content/config.json, one
 * per language) and the site in a language is the config with its dictionary
 * applied. The language is never in the URL: there is one page, "/",
 * prerendered in the base language (`lang`), which every visitor gets until
 * they pick another in the language menu; the browser then remembers it
 * (`savedLocale`). Pure: no DOM, testable.
 *
 * A dictionary is nested like the config's copy, with lists keyed by what
 * identifies their items instead of by position:
 *
 *   form.fields.<name>.label / placeholder / errorMessage / labelHtml / noteHtml
 *   form.fields.<name>.options.<value>                 (optional: keeps the base label)
 *   form.fields.<name>.validate.message
 *   form.fields.<name>.dependsOn.textWhen.<value>.<label|placeholder|errorMessage>
 *   form.sections.<id>.titleHtml
 *   form.submit.label · form.messages.<name> · form.intro.<title|description>
 *   form.shownErrors.<the service's message>
 *   languageMenu · seo · header · hero · thankYou · legal   (same keys as the config)
 *
 * The base copy is the config itself, so the base language has no dictionary.
 * Every other dictionary must translate every non-empty text, and nothing else:
 * the schema fails the build on a missing or unknown key (Universal Form shows a
 * missing key on screen; a static build can refuse to ship it instead).
 *
 * Universal Form's own words (`requiredLegend`, `email.invalid`, `select.*`)
 * are not here: they go in `form.universalV1.config.i18n`, one dictionary per
 * language, and v1 picks one through `config.locale`, which `localize` sets.
 */

type Path = readonly (string | number)[];
type Copy = string | string[];

export interface CopySlot {
  /** Where the text sits in a dictionary. */
  key: string[];
  /** Where it sits in the config. */
  at: Path;
  /** The base language's text. */
  value: Copy;
  /** May be left out of a dictionary (empty in the base, or an option label). */
  optional: boolean;
}

/** Every translatable text of the config. */
export function copySlots(config: SiteConfig): CopySlot[] {
  const slots: CopySlot[] = [];
  const add = (key: string[], at: Path, optional = false) => {
    const value = getAt(config, at);
    if (!isCopy(value)) return;
    slots.push({ key, at, value, optional: optional || value.length === 0 });
  };
  const same = (...path: string[]) => add(path, path);

  same("languageMenu", "name");
  same("languageMenu", "label");
  same("seo", "title");
  same("seo", "description");
  same("seo", "imageAlt");
  same("header", "alt");
  same("hero", "eyebrow");
  same("hero", "titleHtml");
  same("hero", "paragraphsHtml");
  same("thankYou", "titleHtml");
  same("thankYou", "paragraphsHtml");
  same("form", "intro", "title");
  same("form", "intro", "description");

  const v1 = config.form.universalV1;
  const V1 = ["form", "universalV1"];
  v1.sections?.forEach((section, i) =>
    add(["form", "sections", section.id, "titleHtml"], [...V1, "sections", i, "titleHtml"]),
  );
  v1.config.fields.forEach((field, i) => {
    const key = ["form", "fields", field.name];
    const at = [...V1, "config", "fields", i];
    for (const prop of ["label", "labelHtml", "placeholder", "errorMessage", "noteHtml"]) {
      add([...key, prop], [...at, prop]);
    }
    field.options?.forEach((option, j) =>
      add([...key, "options", option.value], [...at, "options", j, "label"], true),
    );
    add([...key, "validate", "message"], [...at, "validate", "message"]);
    for (const [when, text] of Object.entries(field.dependsOn?.textWhen ?? {})) {
      for (const prop of Object.keys(text)) {
        const path = ["dependsOn", "textWhen", when, prop];
        add([...key, ...path], [...at, ...path]);
      }
    }
  });
  add(["form", "submit", "label"], [...V1, "config", "submit", "label"]);
  for (const detail of Object.keys(v1.shownErrors)) {
    add(["form", "shownErrors", detail], [...V1, "shownErrors", detail]);
  }
  for (const name of Object.keys(v1.messages)) {
    add(["form", "messages", name], [...V1, "messages", name]);
  }

  same("legal", "personalizationDisclaimer");
  same("legal", "summaryHtml");
  return slots;
}

/** What is wrong with `dictionary` as a translation of `config` (nothing: []). */
export function dictionaryIssues(
  config: SiteConfig,
  dictionary: Dictionary,
): { key: string[]; message: string }[] {
  const slots = copySlots(config);
  const issues: { key: string[]; message: string }[] = [];
  for (const slot of slots) {
    const value = lookup(dictionary, slot.key);
    if (value === undefined) {
      if (!slot.optional) issues.push({ key: slot.key, message: "Missing translation." });
    } else if (Array.isArray(value) !== Array.isArray(slot.value)) {
      const shape = Array.isArray(slot.value) ? "a list of texts" : "a text";
      issues.push({ key: slot.key, message: `Must be ${shape}, like the base copy.` });
    }
  }
  const known = new Set(slots.map((s) => s.key.join("\u0000")));
  for (const key of leafKeys(dictionary)) {
    if (!known.has(key.join("\u0000"))) {
      issues.push({ key, message: "Not a translatable text of the config." });
    }
  }
  return issues;
}

/** The languages of the site, the base one first. */
export const siteLocales = (config: SiteConfig): string[] => [
  config.lang,
  ...Object.keys(config.i18n),
];

/**
 * The language to show for what the browser remembers from the language menu
 * (null: never used): that one if the site still speaks it, else the base one.
 */
export const savedLocale = (config: SiteConfig, saved: string | null): string =>
  saved && siteLocales(config).includes(saved) ? saved : config.lang;

/** One entry per language for the language menu: its code and its own name. */
export function languages(config: SiteConfig) {
  return siteLocales(config).map((locale) => {
    const dictionary = config.i18n[locale];
    const name = dictionary ? lookup(dictionary, ["languageMenu", "name"]) : undefined;
    return {
      locale,
      code: locale.split("-")[0]!.toUpperCase(),
      name: typeof name === "string" ? name : config.languageMenu.name || locale,
    };
  });
}

/** The site in `locale`: the config with that language's dictionary applied. */
export function localize(config: SiteConfig, locale: string): SiteConfig {
  const out = structuredClone(config);
  if (locale !== config.lang) {
    const dictionary = config.i18n[locale];
    if (!dictionary) throw new Error(`content/config.json has no "${locale}" dictionary.`);
    for (const slot of copySlots(config)) {
      const value = lookup(dictionary, slot.key);
      if (value !== undefined) setAt(out, slot.at, value);
    }
  }
  // Universal Form's own words (`config.i18n`) follow the site's language.
  out.form.universalV1.config.locale = locale;
  return out;
}

const isCopy = (value: unknown): value is Copy =>
  typeof value === "string" ||
  (Array.isArray(value) && value.every((item) => typeof item === "string"));

/** The text at `key`, or undefined (also when `key` leads to a branch, not a text). */
function lookup(dictionary: Dictionary, key: readonly string[]): Copy | undefined {
  let node: Dictionary[string] | undefined = dictionary;
  for (const part of key) {
    if (node === undefined || typeof node === "string" || Array.isArray(node)) return undefined;
    node = node[part];
  }
  return isCopy(node) ? node : undefined;
}

/** The key of every text in a dictionary. */
function leafKeys(dictionary: Dictionary, prefix: string[] = []): string[][] {
  return Object.entries(dictionary).flatMap(([part, node]) =>
    isCopy(node) ? [[...prefix, part]] : leafKeys(node, [...prefix, part]),
  );
}

function getAt(root: unknown, path: Path): unknown {
  let node = root;
  for (const part of path) {
    if (node === null || typeof node !== "object") return undefined;
    node = (node as Record<string | number, unknown>)[part];
  }
  return node;
}

function setAt(root: unknown, path: Path, value: unknown): void {
  const parent = getAt(root, path.slice(0, -1)) as Record<string | number, unknown>;
  parent[path[path.length - 1]!] = value;
}
