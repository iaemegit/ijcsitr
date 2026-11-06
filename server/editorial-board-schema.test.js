import test from "node:test";
import assert from "node:assert/strict";
import { editorialBoardSchema } from "./editorial-board-schema.ts";
const valid = {
  editor_name: "Example Editor",
  editor_affiliation: "Example University, India",
  editor_type: "Editorial Board Member",
  status: 1,
};
test("board validation rejects incomplete members and invalid email/status", () => {
  for (const invalid of [
    { editor_name: "" },
    { editor_affiliation: "" },
    { editor_type: "" },
    { editor_email: "invalid" },
    { status: 2 },
  ])
    assert.equal(
      editorialBoardSchema.safeParse({ ...valid, ...invalid }).success,
      false,
    );
  assert.equal(
    editorialBoardSchema.safeParse({
      ...valid,
      editor_email: "editor@example.org",
    }).success,
    true,
  );
});
test("board validation ignores supplied journal and audit fields", () => {
  const data = editorialBoardSchema.parse({
    ...valid,
    journal_id: 999,
    created_userid: 999,
    updated_date: "1900-01-01",
  });
  assert.equal(data.journal_id, undefined);
  assert.equal(data.created_userid, undefined);
  assert.equal(data.updated_date, undefined);
});
