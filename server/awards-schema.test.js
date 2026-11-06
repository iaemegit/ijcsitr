import test from "node:test";
import assert from "node:assert/strict";
import { awardSchema } from "./awards-schema.ts";
const valid = {
  name: "Example Recipient",
  award_type: "Research Excellence",
  status: 1,
};
test("awards require recipient and award type while email and content are optional", () => {
  assert.equal(awardSchema.safeParse(valid).success, true);
  for (const invalid of [
    { name: "" },
    { award_type: "" },
    { email: "invalid" },
    { content: "x".repeat(256) },
    { status: 2 },
  ])
    assert.equal(
      awardSchema.safeParse({ ...valid, ...invalid }).success,
      false,
    );
});
test("awards ignore client supplied IDs and audit values", () => {
  const data = awardSchema.parse({
    ...valid,
    id: 999,
    created_userid: 999,
    updated_date: "1900-01-01",
  });
  for (const key of ["id", "created_userid", "updated_date"])
    assert.equal(data[key], undefined);
});
