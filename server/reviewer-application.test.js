import test from "node:test";
import assert from "node:assert/strict";
import { reviewerApplicationSchema } from "./reviewer-application.ts";
const valid = { prefix: "Dr", name: "Test Reviewer", email_id: "reviewer@example.org", mobile_number: "1234567890", qualification: "PhD", discipline: "Computer Science", country: "India", state: "Tamil Nadu", city: "Chennai" };
test("reviewer applications validate required contact and qualification fields", () => {
  for (const invalid of [{ email_id: "invalid" }, { country: "Unavailable country" }, { mobile_number: "1" }, { qualification: "" }, { discipline: "" }, { state: "" }, { prefix: "Unknown" }]) assert.equal(reviewerApplicationSchema.safeParse({ ...valid, ...invalid }).success, false);
  assert.equal(reviewerApplicationSchema.safeParse(valid).success, true);
});
test("public reviewer applications ignore supplied audit, status and CV paths", () => {
  const parsed = reviewerApplicationSchema.parse({ ...valid, status: 1, created_userid: 1, resume_cv: "/another-applicant.pdf" });
  assert.equal(Object.hasOwn(parsed, "status"), false);
  assert.equal(Object.hasOwn(parsed, "created_userid"), false);
  assert.equal(Object.hasOwn(parsed, "resume_cv"), false);
});
