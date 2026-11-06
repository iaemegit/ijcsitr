import test from "node:test";
import assert from "node:assert/strict";
import { awardCsv } from "../src/pages/admin/awards/award-export.ts";
test("award CSV escapes quoted and multiline content and neutralizes spreadsheet formulas", () => {
  const csv = awardCsv([
    {
      id: 1,
      name: '=HYPERLINK("example")',
      affiliation: "Example, University",
      content: 'Line 1\n"Line 2"',
      status: 1,
    },
  ]);
  assert.ok(csv.includes('"\'=HYPERLINK(""example"")"'));
  assert.ok(csv.includes('"Example, University"'));
  assert.ok(csv.includes('"Line 1\n""Line 2"""'));
  assert.ok(csv.includes('"Created User ID"'));
});
