/**
 * Autofill styles v1 has no token for, added to the fields' shadow roots. They only read
 * the `--uf-*` tokens the project already sets, so a theme colors them from its
 * theme.css like the rest of the form.
 *
 *  - Autofill: the browser paints its own light-blue background and black text
 *    on an autofilled input. A long background transition keeps the field's own
 *    background; `-webkit-text-fill-color` keeps its text color.
 *  - Select popup: v1 draws a select without `filterable` with the browser's own
 *    popup (light gray highlight). Where the browser supports a customizable
 *    select (`appearance: base-select`), the popup takes the `--uf-dropdown-*` /
 *    `--uf-option-*` tokens, like v1's custom dropdown, without the placeholder
 *    row. Other browsers (iOS Safari, whose native popup takes no CSS) get v1's
 *    custom dropdown instead (`withStyledSelects`), which reads the same tokens.
 *    `filterable` is only the way to get that dropdown: its search box is hidden.
 */

/** Whether the browser can style a select's popup (`appearance: base-select`). Browser only. */
export const supportsBaseSelect = (): boolean =>
  typeof CSS !== "undefined" && CSS.supports("appearance", "base-select");

/**
 * The fields with every select marked `filterable` (v1's custom dropdown) when the
 * browser can't style the native popup; unchanged otherwise. Pure, testable.
 */
export function withStyledSelects<F extends { type: string; filterable?: boolean }>(
  fields: readonly F[],
  baseSelect: boolean,
): F[] {
  if (baseSelect) return [...fields];
  return fields.map((f) => (f.type === "select" ? { ...f, filterable: true } : f));
}

const FIELD_CSS = `
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
textarea:-webkit-autofill,
select:-webkit-autofill {
  -webkit-text-fill-color: var(--uf-input-color);
  caret-color: var(--uf-input-color);
  transition: background-color 600000s 0s, color 600000s 0s;
}

.filter-wrap {
  display: none;
}

@supports (appearance: base-select) {
  select,
  ::picker(select) {
    appearance: base-select;
  }

  select::picker-icon {
    display: none;
  }

  ::picker(select) {
    box-sizing: border-box;
    width: anchor-size(width);
    max-height: var(--uf-dropdown-max-height, 224px);
    margin-block: 4px;
    padding: 4px;
    border: 1px solid var(--uf-dropdown-border);
    border-radius: var(--uf-dropdown-radius);
    background: var(--uf-dropdown-bg);
    box-shadow: var(--uf-dropdown-shadow);
  }

  option {
    padding: 8px 10px;
    border-radius: 5px;
    font-size: var(--uf-input-size);
    cursor: pointer;
  }

  option::checkmark {
    display: none;
  }

  option[value=""]:disabled {
    display: none;
  }

  option:hover,
  option:focus-visible {
    outline: none;
    background: var(--uf-option-hover-bg);
  }

  option:focus-visible {
    box-shadow: inset 0 0 0 2px var(--uf-focus-color);
  }

  option:checked {
    background: var(--uf-option-selected-bg);
    color: var(--uf-option-selected-color);
    font-weight: 500;
  }
}
`;

let sheet: CSSStyleSheet | null | undefined;
const done = new WeakSet<ShadowRoot>();

function getSheet(): CSSStyleSheet | null {
  if (sheet === undefined) {
    try {
      sheet = new CSSStyleSheet();
      sheet.replaceSync(FIELD_CSS);
    } catch {
      sheet = null; // no constructable stylesheets: the fields keep v1's look
    }
  }
  return sheet;
}

/** Adds the styles to the shadow root of every `uf-*` field inside `form` (idempotent). */
export function applyFieldStyles(form: Element): void {
  const css = getSheet();
  if (!css) return;
  for (const el of form.querySelectorAll("*")) {
    const root = el.localName.startsWith("uf-") ? el.shadowRoot : null;
    if (!root || done.has(root)) continue;
    root.adoptedStyleSheets = [...root.adoptedStyleSheets, css];
    done.add(root);
  }
}
