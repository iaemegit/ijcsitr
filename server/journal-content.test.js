import test from "node:test";
import assert from "node:assert/strict";
import { journalHtml } from "./journal-content.ts";
test("journal formatting preserves paragraphs, lists and alignment", () => {
  assert.equal(
    journalHtml(
      '<p style="text-align: center"><strong>Science</strong></p><ul><li>Research</li></ul>',
    ),
    '<p style="text-align:center"><strong>Science</strong></p><ul><li>Research</li></ul>',
  );
});
test("journal formatting removes scripts, unsafe links and event handlers", () => {
  const html = journalHtml(
    '<script>alert(1)</script><p onclick="evil()" style="color:red">Safe</p><a href="javascript:alert(1)">Link</a><img src=x onerror=evil()>',
  );
  assert.equal(html, "<p>Safe</p><a>Link</a>");
  assert.equal(journalHtml(null), null);
});
