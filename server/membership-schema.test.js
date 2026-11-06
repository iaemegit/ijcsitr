import test from "node:test";
import assert from "node:assert/strict";
import { membershipSchema } from "./membership-schema.ts";
const valid = {
  name: "Example Member",
  email: "member@example.org",
  membership_type: "Regular",
  membership_year: 2026,
  status: 1,
};
test("membership requires name, email, type and an integer year", () => {
  assert.equal(membershipSchema.safeParse(valid).success, true);
  for (const invalid of [
    { name: "" },
    { email: "invalid" },
    { membership_type: "" },
    { membership_year: 1899 },
    { membership_year: 2026.5 },
    { status: 2 },
  ])
    assert.equal(
      membershipSchema.safeParse({ ...valid, ...invalid }).success,
      false,
    );
});
test("membership ignores client supplied IDs and audit fields", () => {
  const data = membershipSchema.parse({
    ...valid,
    membership_id: 7,
    created_userid: 999,
    updated_date: "1900-01-01",
  });
  for (const key of ["membership_id", "created_userid", "updated_date"])
    assert.equal(data[key], undefined);
});
