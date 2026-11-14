import type { UniversalFormV1Field } from "../../site/schema.ts";

/**
 * Fields that follow another field's value (`dependsOn` in config.json): hidden
 * for some values (or shown only for some), offered fewer options or other copy for others, disabled
 * while it is empty. v1's own `condition` only reads values of the same `<universal-form>`,
 * and a section is a form of its own, so the page resolves these rules itself
 * and hands each form the result. Pure: no DOM, testable.
 */

type Field = UniversalFormV1Field;

export interface ResolvedFields {
  /** The fields to draw, without the page-side `dependsOn` / `validate` / `noteHtml` (v1 never sees them). */
  fields: Omit<Field, "dependsOn" | "validate" | "noteHtml">[];
  /** Names of the fields drawn but disabled (and, while disabled, not required). */
  disabled: string[];
  /** Names whose current value is no longer valid (hidden, or an option no longer offered). */
  clear: string[];
}

/** Names of the fields some other field depends on. */
export const dependencySources = (fields: readonly Field[]): Set<string> =>
  new Set(fields.flatMap((f) => (f.dependsOn ? [f.dependsOn.field] : [])));

const isSet = (value: unknown) => value !== undefined && value !== null && value !== "";

export function resolveFields(
  fields: readonly Field[],
  values: Record<string, unknown>,
): ResolvedFields {
  const result: ResolvedFields = { fields: [], disabled: [], clear: [] };
  for (const { dependsOn: dep, validate: _rule, noteHtml: _note, ...field } of fields) {
    if (!dep) {
      result.fields.push(field);
      continue;
    }
    const source = isSet(values[dep.field]) ? String(values[dep.field]) : "";
    const current = values[field.name];
    const hidden =
      dep.hiddenWhen.includes(source) || (dep.shownWhen ? !dep.shownWhen.includes(source) : false);
    if (hidden) {
      if (isSet(current)) result.clear.push(field.name);
      continue;
    }
    Object.assign(field, dep.textWhen[source]);
    const allowed = dep.optionsWhen[source];
    if (allowed && field.options) {
      field.options = field.options.filter((o) => allowed.includes(o.value));
      if (isSet(current) && !allowed.includes(String(current))) result.clear.push(field.name);
    }
    if (dep.disabledWhenEmpty && !source) {
      // A disabled field can't be filled, so it can't be required either (no error on it).
      result.disabled.push(field.name);
      field.required = false;
    }
    result.fields.push(field);
  }
  return result;
}

/**
 * The values without the fields `resolved` hides: a hidden field is not part of
 * the entry, and the API checks a select's "" against its options (it answers
 * with that field's error, "Required field") even when the field is optional.
 */
export function withoutHidden(
  values: Record<string, unknown>,
  fields: readonly Pick<Field, "name">[],
  resolved: Pick<ResolvedFields, "fields">,
): Record<string, unknown> {
  const shown = new Set(resolved.fields.map((f) => f.name));
  const out = { ...values };
  for (const f of fields) if (!shown.has(f.name)) delete out[f.name];
  return out;
}
