import { execFile } from "node:child_process";
const sql = `
SET @email_sql=IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='ijcsitr' AND table_name='author' AND column_name='email')=0,'ALTER TABLE ijcsitr.author ADD COLUMN email VARCHAR(255) NULL','SELECT 1');
PREPARE change_stmt FROM @email_sql; EXECUTE change_stmt; DEALLOCATE PREPARE change_stmt;
SET @aff_sql=IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema='ijcsitr' AND table_name='author' AND column_name='affiliation_id')=0,'ALTER TABLE ijcsitr.author ADD COLUMN affiliation_id BIGINT NULL','SELECT 1');
PREPARE change_stmt FROM @aff_sql; EXECUTE change_stmt; DEALLOCATE PREPARE change_stmt;
SET @fk_sql=IF((SELECT COUNT(*) FROM information_schema.table_constraints WHERE constraint_schema='ijcsitr' AND table_name='author' AND constraint_name='author_affiliation_fk')=0,'ALTER TABLE ijcsitr.author ADD CONSTRAINT author_affiliation_fk FOREIGN KEY (affiliation_id) REFERENCES ijcsitr.affiliation(aff_id) ON DELETE SET NULL','SELECT 1');
PREPARE change_stmt FROM @fk_sql; EXECUTE change_stmt; DEALLOCATE PREPARE change_stmt;
`;
await new Promise((resolve, reject) => {
  const child = execFile(
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
    ["--login-path=ijcsitr-migration", "--batch"],
    { windowsHide: true },
    (error) =>
      error
        ? reject(
            new Error(
              "Author form schema upgrade failed. Check the migration login profile.",
            ),
          )
        : resolve(),
  );
  child.stdin.end(sql);
});
console.log(
  "Author email and affiliation reference fields are ready. Existing author data preserved.",
);
