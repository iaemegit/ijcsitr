import { mkdirSync, writeFileSync } from "node:fs";
import assert from "node:assert/strict";
import { query, transaction, db } from "../server/db";
import { legacyAffiliationMatch } from "../server/legacy-affiliation-match";
const apply = process.argv.includes("--apply");
try {
  const affiliations = await query(
    "SELECT aff_id,aff_name,address,country FROM affiliation ORDER BY aff_id",
  );
  const authors = await query(
    "SELECT a.author_id,a.first_name,a.last_name,a.university,a.address,a.country,a.department FROM author a WHERE a.affiliation_id IS NULL AND NOT EXISTS (SELECT 1 FROM author_affiliation aa WHERE aa.author_id=a.author_id) ORDER BY a.author_id",
  );
  const plan = authors.map((author) => ({
    ...author,
    ...legacyAffiliationMatch(author, affiliations),
  }));
  const matches = plan.filter((row) => row.match),
    unresolved = plan.filter((row) => !row.match);
  mkdirSync(".local", { recursive: true });
  writeFileSync(
    ".local/author-affiliation-repair.json",
    JSON.stringify(
      { mode: apply ? "apply" : "preview", matches, unresolved },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify({
      eligible: authors.length,
      clear_matches: matches.length,
      unresolved: unresolved.length,
      report: ".local/author-affiliation-repair.json",
    }),
  );
  console.log(
    JSON.stringify(
      unresolved.map((row) => ({
        author_id: row.author_id,
        institution: row.university,
        candidates: row.candidates,
        reason: row.reason,
      })),
    ),
  );
  if (apply) {
    const before = await query(
      "SELECT author_id,first_name,last_name,university,address,country,department FROM author ORDER BY author_id",
    );
    const articleReferences = await query(
      "SELECT article_id,author_ids FROM article ORDER BY article_id",
    );
    let linked = 0;
    await transaction(async (connection) => {
      for (const row of matches) {
        const [current] = await connection.execute(
          "SELECT author_id FROM author WHERE author_id=? AND affiliation_id IS NULL AND university<=>? AND address<=>? AND country<=>? AND NOT EXISTS (SELECT 1 FROM author_affiliation aa WHERE aa.author_id=author.author_id) FOR UPDATE",
          [row.author_id, row.university, row.address, row.country],
        );
        if (!current.length)
          throw new Error("Author changed during repair. Run preview again.");
        await connection.execute(
          "UPDATE author SET affiliation_id=? WHERE author_id=?",
          [row.match.aff_id, row.author_id],
        );
        await connection.execute(
          "INSERT INTO author_affiliation(author_id,affiliation_id,department,display_order) VALUES (?,?,?,0)",
          [row.author_id, row.match.aff_id, row.department],
        );
        linked++;
      }
    });
    console.log(
      `Linked ${linked} authors. Existing names, departments and article references preserved.`,
    );
    assert.deepEqual(
      await query(
        "SELECT author_id,first_name,last_name,university,address,country,department FROM author ORDER BY author_id",
      ),
      before,
    );
    assert.deepEqual(
      await query(
        "SELECT article_id,author_ids FROM article ORDER BY article_id",
      ),
      articleReferences,
    );
    for (const row of matches) {
      const current = (
        await query(
          "SELECT a.affiliation_id,aa.affiliation_id selected_id,aa.department FROM author a JOIN author_affiliation aa ON aa.author_id=a.author_id AND aa.affiliation_id=a.affiliation_id WHERE a.author_id=?",
          [row.author_id],
        )
      )[0];
      assert.equal(current.affiliation_id, row.match.aff_id);
      assert.equal(current.selected_id, row.match.aff_id);
      assert.equal(current.department, row.department);
    }
    console.log(
      "Verified saved relationships, departments, unchanged author details and unchanged article references.",
    );
  }
} finally {
  await db.end();
}
