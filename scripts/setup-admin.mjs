import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
const sql = readFileSync(new URL("./setup-admin.sql", import.meta.url), "utf8");
await new Promise((resolve, reject) => {
  const child = execFile(
    process.env.MYSQL_CLI ||
      "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
    ["--login-path=ijcsitr-migration", "--batch"],
    { windowsHide: true },
    (error) =>
      error
        ? reject(
            new Error(
              "Admin setup failed. Verify your MySQL migration login profile.",
            ),
          )
        : resolve(),
  );
  child.stdin.end(sql);
});
console.log(
  "Discipline management and password-upgrade permissions configured.",
);
