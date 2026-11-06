import { execFile } from "node:child_process";
const sql = `CREATE TABLE IF NOT EXISTS ijcsitr.author_affiliation (
 author_id BIGINT NOT NULL, affiliation_id BIGINT NOT NULL, department TEXT NULL, display_order INT NOT NULL DEFAULT 0,
 PRIMARY KEY(author_id,affiliation_id),
 CONSTRAINT author_affiliations_author_fk FOREIGN KEY(author_id) REFERENCES ijcsitr.author(author_id) ON DELETE CASCADE,
 CONSTRAINT author_affiliations_affiliation_fk FOREIGN KEY(affiliation_id) REFERENCES ijcsitr.affiliation(aff_id) ON DELETE RESTRICT
);
INSERT IGNORE INTO ijcsitr.author_affiliation (author_id,affiliation_id,department,display_order) SELECT author_id,affiliation_id,department,0 FROM ijcsitr.author WHERE affiliation_id IS NOT NULL;
GRANT SELECT,INSERT,UPDATE,DELETE ON ijcsitr.author_affiliation TO 'ijcsitr_app'@'127.0.0.1';`;
await new Promise((resolve, reject) => {
  const child = execFile(
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
    ["--login-path=ijcsitr-migration", "--batch"],
    { windowsHide: true },
    (error) =>
      error
        ? reject(
            new Error(
              "Author affiliations upgrade failed. Check your migration login profile.",
            ),
          )
        : resolve(),
  );
  child.stdin.end(sql);
});
console.log(
  "Multiple author affiliations are ready; existing primary affiliations preserved.",
);
