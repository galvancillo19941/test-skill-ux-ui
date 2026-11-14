import { describe, expect, test } from "vite-plus/test";
import { documentAt, documentPageFile, type SiteDocument } from "./documents.ts";

const rules: SiteDocument = { path: "/rules", lang: "en", title: "Official Rules", file: "" };
const terms: SiteDocument = {
  path: "/termsofuse",
  lang: "en",
  title: "Terms of Use",
  file: "docs/terms-of-use.pdf",
};

describe("documentPageFile", () => {
  test("each document's page is <path>/index.html", () => {
    expect(documentPageFile(terms)).toBe("termsofuse/index.html");
    expect(documentPageFile(rules)).toBe("rules/index.html");
  });
});

describe("documentAt", () => {
  test("matches the path with or without a trailing slash, index.html or query", () => {
    const docs = [rules, terms];
    expect(documentAt(docs, "/rules")).toBe(rules);
    expect(documentAt(docs, "/rules/")).toBe(rules);
    expect(documentAt(docs, "/rules/index.html")).toBe(rules);
    expect(documentAt(docs, "/termsofuse?utm_source=x")).toBe(terms);
  });

  test("anything else is not a document", () => {
    expect(documentAt([rules, terms], "/")).toBeUndefined();
    expect(documentAt([rules, terms], "/termsofuse.pdf")).toBeUndefined();
    expect(documentAt([rules], "/rules-es")).toBeUndefined();
    expect(documentAt([rules], "/rules/x")).toBeUndefined();
    expect(documentAt([rules], undefined)).toBeUndefined();
  });
});
