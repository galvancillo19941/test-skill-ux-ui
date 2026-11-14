import { describe, expect, test } from "vite-plus/test";
import { absoluteLinks, withAbsoluteLinks } from "./labelLinks.ts";

const base = "https://www.example.com/";

describe("absoluteLinks", () => {
  test("site paths become absolute on the page's origin", () => {
    expect(absoluteLinks('agree to the <a href="/rules" target="_blank">Rules</a>', base)).toBe(
      'agree to the <a href="https://www.example.com/rules" target="_blank">Rules</a>',
    );
  });

  test("absolute, protocol-relative and other links are left as they are", () => {
    const html =
      '<a href="https://x.com/a">a</a> <a href="//cdn.x.com/b">b</a> <a href="mailto:a@b.co">c</a>';
    expect(absoluteLinks(html, base)).toBe(html);
  });

  test("only labels with HTML change", () => {
    const fields = [{ labelHtml: '<a href="/rules-es">R</a>' }, { labelHtml: undefined }];
    expect(withAbsoluteLinks(fields, base)).toEqual([
      { labelHtml: '<a href="https://www.example.com/rules-es">R</a>' },
      { labelHtml: undefined },
    ]);
  });
});
