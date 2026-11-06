import test from "node:test";
import assert from "node:assert/strict";
import { legacyAffiliationMatch } from "./legacy-affiliation-match.ts";
const affiliation = {
  aff_id: 7,
  aff_name: "Example Institute",
  address: "Chennai",
  country: "India",
};
const author = {
  university: "Example Institute",
  address: "Chennai",
  country: "India",
};
test("legacy affiliations match only one institution with the same name, address and country", () => {
  assert.equal(legacyAffiliationMatch(author, [affiliation]).match.aff_id, 7);
  assert.equal(
    legacyAffiliationMatch({ ...author, university: " EXAMPLE  INSTITUTE. " }, [
      affiliation,
    ]).match.aff_id,
    7,
  );
  assert.equal(
    legacyAffiliationMatch({ ...author, address: "Delhi" }, [affiliation])
      .match,
    null,
  );
  assert.equal(
    legacyAffiliationMatch({ ...author, country: "Singapore" }, [affiliation])
      .match,
    null,
  );
});
test("legacy matching leaves duplicate institutions and missing names for review", () => {
  const ambiguous = legacyAffiliationMatch(author, [
    affiliation,
    { ...affiliation, aff_id: 8 },
  ]);
  assert.equal(ambiguous.match, null);
  assert.deepEqual(ambiguous.candidates, [7, 8]);
  assert.equal(
    legacyAffiliationMatch({ ...author, university: "" }, [affiliation]).match,
    null,
  );
});
