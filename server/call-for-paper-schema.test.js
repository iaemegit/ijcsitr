import test from "node:test";
import assert from "node:assert/strict";
import { callForPaperSchema } from "./call-for-paper-schema.ts";
const valid = {
  issue_month: "January",
  issue_year: "2026",
  deadline: "2026-06-30",
  dispatch_month: "July",
  dispatch_year: "2026",
  dispatch_date: "2026-06-30",
  status: 1,
};
test("calls validate calendar dates, months, years, status and deadline chronology", () => {
  assert.equal(callForPaperSchema.safeParse(valid).success, true);
  for (const invalid of [
    { issue_month: "" },
    { issue_year: "26" },
    { deadline: "2026-02-30" },
    { dispatch_date: "2026-06-29" },
    { status: 2 },
  ])
    assert.equal(
      callForPaperSchema.safeParse({ ...valid, ...invalid }).success,
      false,
    );
});
test("calls ignore client supplied identity and audit fields", () => {
  const data = callForPaperSchema.parse({
    ...valid,
    call_id: 7,
    created_userid: 999,
    updated_date: "1900-01-01",
  });
  for (const key of ["call_id", "created_userid", "updated_date"])
    assert.equal(data[key], undefined);
});
