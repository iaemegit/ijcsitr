import test from "node:test";
import assert from "node:assert/strict";
import { issueSchema } from "./journal-issue.ts";
const issue = {
  year: "2026",
  volume_no: "1",
  issue_no: "2",
  from_month: "January",
  to_month: "June",
  special_issue: "No",
  status: 1,
};
test("journal issue validates publication period and special issue title", () => {
  assert.equal(issueSchema.safeParse(issue).success, true);
  for (const invalid of [
    { year: "xx" },
    { volume_no: "0" },
    { issue_no: "-1" },
    { from_month: "June", to_month: "January" },
    { special_issue: "Yes", special_issue_title: "" },
    { status: 2 },
  ])
    assert.equal(
      issueSchema.safeParse({ ...issue, ...invalid }).success,
      false,
    );
  assert.equal(
    issueSchema.safeParse({
      ...issue,
      special_issue: "Yes",
      special_issue_title: "AI Research",
    }).success,
    true,
  );
});
test("journal issue ignores client-supplied journal and audit identities", () => {
  const data = issueSchema.parse({
    ...issue,
    journals_id: 999,
    created_userid: 999,
    issue_id: 999,
  });
  assert.equal(data.journals_id, undefined);
  assert.equal(data.created_userid, undefined);
  assert.equal(data.issue_id, undefined);
});
