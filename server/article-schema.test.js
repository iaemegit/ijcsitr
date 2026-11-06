import test from "node:test";
import assert from "node:assert/strict";
import { articleSchema } from "./article-schema.ts";
const valid = {
  article_title: "A useful research article",
  issue_id: 2,
  author_ids: [2, 3],
  abstract: "A detailed abstract for a new research article.",
  date_of_publication: "2026-02-28",
  status: 0,
};
test("articles validate dates, author order, duplicate authors and corresponding author", () => {
  assert.deepEqual(articleSchema.parse(valid).author_ids, [2, 3]);
  for (const invalid of [
    { article_title: "x" },
    { author_ids: [] },
    { author_ids: [2, 2] },
    { corresponding_author: "9" },
    { date_of_publication: "2026-02-30" },
    { date_of_received: "2026-03-01" },
    { date_of_received: "2026-02-20", date_of_acceptance: "2026-02-19" },
    { page_from: "20", page_to: "10" },
    { status: 2 },
  ])
    assert.equal(
      articleSchema.safeParse({ ...valid, ...invalid }).success,
      false,
    );
  assert.equal(
    articleSchema.safeParse({
      ...valid,
      corresponding_author: "3",
      page_from: "e12",
      page_to: "e13",
    }).success,
    true,
  );
});
test("articles ignore client-supplied journal, audit fields and traffic counters", () => {
  const data = articleSchema.parse({
    ...valid,
    journal_id: 999,
    created_userid: 999,
    views: 999,
    year: "1900",
    volume: "999",
    issue: "999",
  });
  for (const key of [
    "journal_id",
    "created_userid",
    "views",
    "year",
    "volume",
    "issue",
  ])
    assert.equal(data[key], undefined);
});
test("article rich text keeps formatting and strips unsafe markup", () => {
  const data = articleSchema.parse({
    ...valid,
    abstract:
      "<p>A detailed <strong>research abstract</strong>.</p><script>alert(1)</script>",
    reference:
      '<p onclick="bad()">Reference <a href="javascript:bad()">link</a></p>',
  });
  assert.match(data.abstract, /<strong>research abstract<\/strong>/);
  assert.doesNotMatch(data.abstract, /<script|alert\(1\)/);
  assert.doesNotMatch(data.reference, /onclick|javascript:/);
  assert.equal(
    articleSchema.safeParse({ ...valid, abstract: "<p><br></p><p><br></p>" })
      .success,
    false,
  );
});
