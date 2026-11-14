import type { UniversalFormV1Config } from "../../site/schema.ts";

/**
 * Logic for a Universal Form v1 split in sections: one `<universal-form>` per
 * section (a single step with `hideNav`, so v1 draws no buttons) and ONE submit
 * button drawn by the page. Pure functions, no DOM, so they can be tested.
 *
 * What v1 gives us (verified in the bundle): `validateStep()` validates the
 * fields on screen, paints their errors and returns a boolean; `values` is a
 * copy of the values collected so far; `submit()` validates and fires
 * `uf-submit` with `detail.metadata`; a step with `hideNav` draws no nav and,
 * as the form is multi-step, no submit button either.
 */

type V1 = UniversalFormV1Config;
export type SectionDef = NonNullable<V1["sections"]>[number];

/** The slice of a `<universal-form>` this module needs. */
export interface SectionForm {
  validateStep(): boolean;
  readonly values: Record<string, unknown>;
}

/** The `config` of one section's form: a single step, no buttons, only its fields. */
export function sectionConfig(base: V1["config"], section: SectionDef) {
  const byName = new Map(base.fields.map((f) => [f.name, f]));
  const fields = section.fields.map((name) => byName.get(name)).filter((f) => f !== undefined);
  return {
    steps: [{ title: section.id, hideNav: true, fields }],
    ...(base.locale ? { locale: base.locale } : {}),
    ...(base.i18n ? { i18n: base.i18n } : {}),
  };
}

/** Field names in config order — the order of the payload. */
export const fieldOrder = (config: V1["config"]): string[] => config.fields.map((f) => f.name);

/**
 * One flat object from the values of every section, keys in `order`. A field
 * nobody touched is "" (v1 only keeps what changed), as v1's own `uf-submit` does.
 */
export function collectValues(
  order: readonly string[],
  sectionValues: readonly Record<string, unknown>[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const name of order) {
    const owner = sectionValues.find((v) => name in v);
    values[name] = owner ? owner[name] : "";
  }
  return values;
}

/**
 * Validates EVERY section (no early exit, so every error is painted) and
 * returns the indexes of the ones that failed, in screen order.
 */
export function validateAll(forms: readonly Pick<SectionForm, "validateStep">[]): number[] {
  const invalid: number[] = [];
  forms.forEach((form, i) => {
    if (!form.validateStep()) invalid.push(i);
  });
  return invalid;
}

export type SectionedSubmit =
  | { status: "invalid"; invalid: number[] }
  | { status: "sent" | "failed" };

/**
 * The page's submit: validate all sections and run the page's own `check` on the
 * values (both always, so every error shows at once); if either fails, stop
 * (nothing is sent); otherwise call `send` ONCE.
 */
export async function submitSections(options: {
  forms: readonly SectionForm[];
  order: readonly string[];
  check?: (values: Record<string, unknown>) => boolean;
  send: (values: Record<string, unknown>) => Promise<boolean>;
}): Promise<SectionedSubmit> {
  const { forms, order, check, send } = options;
  const invalid = validateAll(forms);
  const values = collectValues(
    order,
    forms.map((f) => f.values),
  );
  const checked = check ? check(values) : true;
  if (invalid.length > 0 || !checked) return { status: "invalid", invalid };
  const ok = await send(values);
  return { status: ok ? "sent" : "failed" };
}

/** Visit metadata from the page itself, for when v1's own can't be had (no `dev`). */
export function pageMetadata(): Record<string, string> {
  const metadata: Record<string, string> = {
    url: location.href,
    http_referrer: document.referrer || "",
    userAgent: navigator.userAgent,
  };
  const search = new URL(location.href).searchParams;
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_id",
    "utm_term",
    "utm_content",
  ]) {
    const value = search.get(key);
    if (value) metadata[key] = value;
  }
  return metadata;
}
