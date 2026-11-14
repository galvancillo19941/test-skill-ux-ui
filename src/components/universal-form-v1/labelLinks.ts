import type { UniversalFormV1Field } from "../../site/schema.ts";

/**
 * Site links in a checkbox's `labelHtml` (`href="/rules"`): v1's label
 * sanitizer keeps a link only if its href parses as an absolute http(s) URL and
 * drops the `<a>` otherwise, so the page resolves them against its own address
 * before v1 sees them (the same build works on test and prod). Pure, testable.
 */
export function absoluteLinks(html: string, base: string): string {
  return html.replace(/(\shref=")(\/(?!\/)[^"]*)"/g, (_, attr: string, path: string) => {
    return `${attr}${new URL(path, base).href}"`;
  });
}

export function withAbsoluteLinks<F extends Pick<UniversalFormV1Field, "labelHtml">>(
  fields: readonly F[],
  base: string,
): F[] {
  return fields.map((f) =>
    f.labelHtml ? { ...f, labelHtml: absoluteLinks(f.labelHtml, base) } : f,
  );
}
