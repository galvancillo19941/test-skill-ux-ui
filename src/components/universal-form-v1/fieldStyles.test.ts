import { describe, expect, test } from "vite-plus/test";
import { withStyledSelects } from "./fieldStyles.ts";

const fields = [
  { name: "entry_category", type: "select" },
  { name: "first_name", type: "text" },
  { name: "country", type: "select", filterable: false },
];

describe("withStyledSelects", () => {
  test("without base-select every select becomes v1's custom dropdown", () => {
    expect(withStyledSelects(fields, false)).toEqual([
      { name: "entry_category", type: "select", filterable: true },
      { name: "first_name", type: "text" },
      { name: "country", type: "select", filterable: true },
    ]);
  });

  test("with base-select the fields are unchanged", () => {
    expect(withStyledSelects(fields, true)).toEqual(fields);
  });

  test("does not change the fields it is given", () => {
    withStyledSelects(fields, false);
    expect(fields[0]).toEqual({ name: "entry_category", type: "select" });
  });
});
