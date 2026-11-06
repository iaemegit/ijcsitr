import { test } from "node:test";
import assert from "node:assert/strict";
import { authorIds, plain, safeUrl } from "./content.ts";
test("legacy author formats resolve safely without duplicate authors", () => {
  assert.deepEqual(authorIds("[12, 14, 12]"), [12, 14]);
  assert.deepEqual(authorIds(null), []);
});
test("untrusted source content is rendered as text and executable links are rejected", () => {
  assert.equal(
    plain("<script>alert(1)</script><p>Research &amp; practice</p>"),
    "Research & practice",
  );
  assert.equal(safeUrl("javascript:alert(1)"), null);
  assert.equal(safeUrl("/uploads/private.pdf"), null);
  assert.equal(
    safeUrl("https://doi.org/10.123/example"),
    "https://doi.org/10.123/example",
  );
});
