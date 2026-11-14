import type { UniversalFormV1Field } from "../../site/schema.ts";

/**
 * Page-side value checks (`validate` in config.json): v1 only knows "required",
 * so formats such as "numbers only" or "a roblox.com link" are checked here,
 * after v1's own validation passed and before anything is sent. Pure: testable.
 */

export interface RuleError {
  name: string;
  message: string;
}

/** Every field (in config order) whose value doesn't match its `validate.pattern`. */
export function ruleErrors(
  fields: readonly Pick<UniversalFormV1Field, "name" | "validate">[],
  values: Record<string, unknown>,
): RuleError[] {
  const errors: RuleError[] = [];
  for (const field of fields) {
    const rule = field.validate;
    const value = values[field.name];
    if (!rule || typeof value !== "string" || value.trim() === "") continue;
    // Whole value, case-insensitive (hosts are). The schema already checked it compiles.
    if (!new RegExp(`^(?:${rule.pattern})$`, "i").test(value.trim())) {
      errors.push({ name: field.name, message: rule.message });
    }
  }
  return errors;
}
