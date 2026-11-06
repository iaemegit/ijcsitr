import { hashPassword } from "../server/admin-security.ts";
import { query, db } from "../server/db.ts";
function hidden(prompt) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY)
      return reject(
        new Error("Open this command in an interactive PowerShell terminal."),
      );
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    let value = "";
    function finish() {
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdin.off("data", onData);
      process.stdout.write("\n");
    }
    function onData(text) {
      for (const char of text) {
        if (char === "\u0003") {
          finish();
          reject(new Error("Cancelled"));
          return;
        }
        if (char === "\r" || char === "\n") {
          finish();
          resolve(value);
          return;
        }
        if (char === "\u007f" || char === "\b") {
          if (value) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
        } else if (char >= " ") {
          value += char;
          process.stdout.write("*");
        }
      }
    }
    process.stdin.on("data", onData);
  });
}
try {
  const id = Number(process.env.ADMIN_USER_ID || 1);
  const users = await query("SELECT user_name FROM users WHERE user_id=?", [
    id,
  ]);
  if (!users.length) throw new Error("Admin account not found.");
  console.log(`Set password for admin account: ${users[0].user_name}`);
  const password = await hidden("New password (at least 12 characters): ");
  if (password.length < 12 || password.length > 256)
    throw new Error("Use 12 to 256 characters.");
  const confirm = await hidden("Confirm password: ");
  if (confirm !== password) throw new Error("Passwords do not match.");
  await query(
    "UPDATE users SET user_password=?,user_updated_at=NOW(6) WHERE user_id=?",
    [await hashPassword(password), id],
  );
  console.log(
    "Admin password updated. Existing portal sessions are now invalid.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
