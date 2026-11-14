import { describe, expect, test } from "vite-plus/test";
import rawConfig from "../../../content/config.json";
import { siteConfigSchema } from "../../site/schema.ts";
import { ruleErrors } from "./fieldRules.ts";

const fields = [
  { name: "code", validate: { pattern: "[0-9]{1,20}", message: "Numbers only." } },
  {
    name: "link",
    validate: { pattern: "https://([a-z0-9-]+\\.)*roblox\\.com/\\S*", message: "Link." },
  },
  { name: "free" },
];
const ok = { code: "12345678", link: "https://www.roblox.com/games/1", free: "anything" };
const check = (values: Record<string, unknown>) =>
  ruleErrors(fields, { ...ok, ...values }).map((e) => e.name);

describe("ruleErrors", () => {
  test("matching values and fields without a rule pass", () => {
    expect(check({})).toEqual([]);
    expect(check({ free: "12a45" })).toEqual([]);
  });

  test("the whole value must match, case-insensitive and trimmed", () => {
    expect(check({ link: "  HTTPS://WWW.ROBLOX.COM/games/1  " })).toEqual([]);
    for (const bad of ["12a45", "12 34", "-1", "1".repeat(21)]) {
      expect(check({ code: bad })).toEqual(["code"]);
    }
    for (const bad of ["https://roblox.com.evil.io/games/1", "https://evilroblox.com/games/1"]) {
      expect(check({ link: bad })).toEqual(["link"]);
    }
  });

  test("empty values are left to v1's required check; every broken field is reported, in order, with its message", () => {
    expect(check({ code: "", link: "" })).toEqual([]);
    expect(ruleErrors(fields, { code: "x", link: "x" })).toEqual([
      { name: "code", message: "Numbers only." },
      { name: "link", message: "Link." },
    ]);
  });
});

describe("ruleErrors (content/config.json rules)", () => {
  const fields = siteConfigSchema.parse(rawConfig).form.universalV1.config.fields;
  const ok = { creator_id: "123456789", experience_id_url: "https://www.roblox.com/games/1" };
  const check = (values: Record<string, unknown>) =>
    ruleErrors(fields, { ...ok, ...values }).map((e) => e.name);

  test("a numeric creator id and a real link pass", () => {
    expect(check({})).toEqual([]);
    for (const link of [
      "http://example.com",
      "https://roblox.com/games/1?ref=x",
      "  HTTPS://WWW.ROBLOX.COM/games/1  ",
      "https://sub.example.co.uk:8080/a/b#c",
      "https://my-game.dev",
      "https://163.com",
      "https://www.163.com",
    ]) {
      expect(check({ experience_id_url: link })).toEqual([]);
    }
  });

  test("creator id must be exactly 9 digits, digits only", () => {
    expect(check({ creator_id: "000000001" })).toEqual([]);
    expect(check({ creator_id: " 123456789 " })).toEqual([]);
    for (const bad of [
      "1",
      "12345678",
      "1234567890",
      "12345678a",
      "1234 56789",
      "-12345678",
      "1.2345678",
    ]) {
      expect(check({ creator_id: bad })).toEqual(["creator_id"]);
    }
  });

  test("the link must be an http(s) URL with a plausible domain", () => {
    for (const bad of [
      "hello",
      "https://",
      "https://localhost",
      "www.roblox.com/games/1",
      "roblox.com",
      "javascript:alert(1)",
      "https://roblox .com",
      "ftp://example.com",
      // Shaped like a URL, but no plausible domain: www + a single label, a
      // one-letter or numeric ending, only numbers before the ending, a label
      // starting with a hyphen.
      "https://www.roblox",
      "https://www.roblox/games/1",
      "https://www.re",
      "https://www.roblox.c",
      "https://a.b",
      "https://1.2.3.4",
      "https://1.2.3.4.co",
      "https://1.2.co/x",
      "https://-roblox.com",
    ]) {
      expect(check({ experience_id_url: bad })).toEqual(["experience_id_url"]);
    }
  });
});
