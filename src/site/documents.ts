import type { SiteConfig } from "./schema.ts";

/**
 * The documents (config.documents), each at its own path (`/termsofuse`): a
 * page prerendered to `<path>/index.html` (S3 and nginx serve `/termsofuse/`
 * from it and redirect `/termsofuse` there) that shows the PDF right there, in
 * the page (DocumentPage). Until a document has its PDF the page is blank.
 * `vp dev` and `vp preview` serve them at their path too (vite.config.ts), where
 * the SPA fallback would otherwise show the home page. Pure: no DOM, testable.
 */

export type SiteDocument = SiteConfig["documents"][number];

/** Where the document's page goes in dist/. */
export const documentPageFile = (doc: SiteDocument): string => `${doc.path.slice(1)}/index.html`;

/** The document whose page is at `url` (`/rules`, `/rules/`, with or without a query), if any. */
export function documentAt(
  documents: readonly SiteDocument[],
  url: string | undefined,
): SiteDocument | undefined {
  const path = (url ?? "").split(/[?#]/)[0]!.replace(/\/(index\.html)?$/, "");
  return documents.find((d) => d.path === path);
}
