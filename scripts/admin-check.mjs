import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { db, query } from "../server/db.ts";
const mysql = "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe";
function root(sql) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      mysql,
      ["--login-path=ijcsitr-migration", "--batch", "--skip-column-names"],
      { windowsHide: true },
      (error, stdout) =>
        error
          ? reject(new Error("Test database setup/cleanup failed."))
          : resolve(stdout),
    );
    child.stdin.end(sql);
  });
}
const marker = "Admin integration " + randomUUID(),
  username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex");
const base = "http://127.0.0.1:4002";
let userId, child, browser;
const before = await query(
  "SELECT discipline_id,discipline_name,department,status,created_date,created_userid,updated_date,updated_userid FROM discipline ORDER BY discipline_id",
);
try {
  await root(
    `INSERT INTO ijcsitr.users(user_name,user_password,user_created_at) VALUES ('${username}','${password}',NOW(6));`,
  );
  userId = (
    await query("SELECT user_id FROM users WHERE user_name=?", [username])
  )[0].user_id;
  child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: "4002", ADMIN_USER_ID: String(userId) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Test API did not start")),
      15000,
    );
    child.stdout.on("data", (data) => {
      if (data.toString().includes("IJCSITR API:")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error("Test API exited " + code));
    });
  });
  let cookie = "",
    csrf = "";
  async function call(
    route,
    {
      method = "GET",
      body,
      status = 200,
      authenticated = true,
      headers = {},
    } = {},
  ) {
    const response = await fetch(base + "/api/admin" + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Request": "1",
        ...(authenticated ? { Cookie: cookie, "X-CSRF-Token": csrf } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await response.json();
    assert.equal(
      response.status,
      status,
      `${method} ${route}: ${data.error || ""}`,
    );
    return { response, data };
  }
  await call("/disciplines", { authenticated: false, status: 401 });
  await call("/disciplines", {
    method: "POST",
    body: {},
    authenticated: false,
    status: 401,
  });
  await call("/login", {
    method: "POST",
    body: { username, password },
    headers: { Origin: "https://untrusted.example" },
    status: 403,
  });
  await call("/login", {
    method: "POST",
    body: { username, password },
    headers: { "X-Admin-Request": "0" },
    status: 403,
  });
  await call("/login", {
    method: "POST",
    body: { username: "not-an-admin", password },
    status: 401,
  });
  const login = await call("/login", {
    method: "POST",
    body: { username, password },
  });
  const cookieHeader = login.response.headers.get("set-cookie");
  assert.match(cookieHeader, /HttpOnly/i);
  assert.match(cookieHeader, /SameSite=Strict/i);
  assert.match(cookieHeader, /Path=\/api\/admin/);
  cookie = cookieHeader.split(";")[0];
  csrf = login.data.csrfToken;
  assert.ok(csrf);
  assert.equal(login.data.user.name, username);
  assert.equal(login.data.user.password, undefined);
  assert.match(
    (
      await query("SELECT user_password FROM users WHERE user_id=?", [userId])
    )[0].user_password,
    /^scrypt\$/,
  );
  await call("/session");
  await call("/dashboard");
  const data = {
    discipline_name: marker,
    department: "Test department",
    status: 1,
  };
  await call("/disciplines", {
    method: "POST",
    body: data,
    headers: { "X-CSRF-Token": "wrong" },
    status: 403,
  });
  await call("/disciplines", {
    method: "POST",
    body: { ...data, discipline_name: " " },
    status: 400,
  });
  const created = await call("/disciplines", {
    method: "POST",
    body: data,
    status: 201,
  });
  const id = created.data.id;
  await root(
    `INSERT INTO ijcsitr.journal (journal_name,journal_key,discipline_id,publication_frequency,start_month,start_year) VALUES ('${marker}','${randomUUID()}',${Number(id)},'2','1','2026');`,
  );
  assert.equal(
    (await call("/disciplines/" + id)).data.discipline.discipline_name,
    marker,
  );
  await call("/disciplines/not-a-number", { status: 400 });
  await call("/disciplines/999999999", { status: 404 });
  const list = await call("/disciplines?q=" + encodeURIComponent(marker));
  assert.equal(list.data.total, 1);
  assert.equal(list.data.disciplines[0].created_userid, userId);
  await call("/disciplines/" + id, {
    method: "PUT",
    body: { ...data, department: "Updated department", status: 0 },
  });
  const edited = (await call("/disciplines?q=" + encodeURIComponent(marker)))
    .data.disciplines[0];
  assert.equal(edited.department, "Updated department");
  assert.equal(edited.status, 0);
  assert.equal(edited.updated_userid, userId);
  assert.equal(
    (await call("/disciplines?q=" + encodeURIComponent("' OR 1=1 --"))).data
      .total,
    0,
  );
  assert.equal((await call("/disciplines?q=%25")).data.total, 0);
  await call("/disciplines?page=-1", { status: 400 });
  await call("/disciplines/999999999", {
    method: "PUT",
    body: data,
    status: 404,
  });
  await call("/disciplines/999999999", { method: "DELETE", status: 404 });
  await call("/disciplines/" + id, { method: "DELETE" });
  assert.equal(
    (
      await query("SELECT discipline_id FROM journal WHERE journal_name=?", [
        marker,
      ])
    )[0].discipline_id,
    null,
  );
  assert.equal(
    (await call("/disciplines?q=" + encodeURIComponent(marker))).data.total,
    0,
  );
  // Browser coverage uses the same temporary account, not the real administrator.
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  mkdirSync(".local/screenshots", { recursive: true });
  await page.goto(base + "/portal/admin/discipline");
  await page.waitForURL("**/portal/admin/login");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: ".local/screenshots/admin-login.png",
    fullPage: true,
  });
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Show password" }).click();
  assert.equal(
    await page.locator("#admin-password").getAttribute("type"),
    "text",
  );
  await page.getByRole("button", { name: "Hide password" }).click();
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page
    .getByRole("heading", { name: "Manage journal foundations." })
    .waitFor();
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Discipline", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Discipline", exact: true })
    .waitFor();
  await page.locator(".admin-data-table tbody tr").first().waitFor();
  assert.equal(
    await page.getByRole("link", { name: "Add new", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "Add new", exact: true }).count(),
    0,
  );
  await page.goto(base + "/portal/admin/discipline/add");
  await page.waitForURL("**/portal/admin/discipline/add");
  await page.reload();
  await page
    .getByRole("heading", { name: "Add discipline", exact: true })
    .waitFor();
  await page.getByLabel("Discipline name").fill(marker + " browser");
  await page
    .getByLabel("Department", { exact: true })
    .fill("Browser department");
  await page.screenshot({
    path: ".local/screenshots/admin-discipline-add.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create discipline" }).click();
  await page.waitForURL("**/portal/admin/discipline");
  await page.getByLabel("Search disciplines").fill(marker + " browser");
  await page
    .locator(".admin-data-table tbody tr")
    .filter({ hasText: marker + " browser" })
    .waitFor();
  await page
    .getByRole("button", { name: "Edit " + marker + " browser", exact: true })
    .click();
  await page.waitForURL(/\/portal\/admin\/discipline\/edit\?id=\d+$/);
  await page.reload();
  await page.getByLabel("Discipline name").waitFor();
  assert.equal(
    await page.getByLabel("Discipline name").inputValue(),
    marker + " browser",
  );
  await page
    .getByLabel("Department", { exact: true })
    .fill("Edited in browser");
  await page.getByLabel("Status").selectOption("0");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL("**/portal/admin/discipline");
  await page.getByLabel("Search disciplines").fill(marker + " browser");
  await page
    .getByRole("cell", { name: "Edited in browser", exact: true })
    .waitFor();
  await page.screenshot({
    path: ".local/screenshots/admin-discipline.png",
    fullPage: true,
  });
  await page.reload();
  await page
    .getByRole("heading", { name: "Discipline", exact: true })
    .waitFor();
  await page.getByLabel("Search disciplines").fill(marker + " browser");
  await page
    .getByRole("cell", { name: "Edited in browser", exact: true })
    .waitFor();
  assert.equal(await page
    .getByRole("button", { name: "Delete " + marker + " browser", exact: true })
    .isDisabled(), true);
  await page
    .getByRole("cell", { name: "Edited in browser", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile discipline page overflows",
  );
  await page.getByRole("button", { name: "Open admin menu" }).click();
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Dashboard", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Manage journal foundations." })
    .waitFor();
  assert.equal(
    await page
      .getByRole("link", { name: "Add discipline", exact: true })
      .count(),
    0,
  );
  await page.goto(base + "/portal/admin/discipline/add");
  await page.waitForURL("**/portal/admin/discipline/add");
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Mobile add page overflows",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.waitForURL("**/portal/admin/discipline");
  await page.goto(base + "/portal/admin/discipline/edit");
  await page
    .getByRole("heading", { name: "Choose a discipline to edit" })
    .waitFor();
  await page
    .getByRole("link", { name: "View disciplines", exact: true })
    .click();
  await page.waitForURL("**/portal/admin/discipline");
  await page.screenshot({
    path: ".local/screenshots/admin-mobile.png",
    fullPage: true,
  });
  await page.getByLabel("Search disciplines").fill(marker + " browser");
  assert.equal(await page
    .getByRole("button", { name: "Delete " + marker + " browser", exact: true })
    .isDisabled(), true);
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForURL("**/portal/admin/login");
  await page.goto(base + "/portal/admin/discipline");
  await page.waitForURL("**/portal/admin/login");
  await call("/logout", { method: "POST" });
  await call("/disciplines", { status: 401 });
  assert.deepEqual(runtimeErrors, []);
  await root(`DELETE FROM ijcsitr.discipline WHERE created_userid=${Number(userId)} AND discipline_name LIKE '${marker}%';`);
  assert.deepEqual(
    await query(
      "SELECT discipline_id,discipline_name,department,status,created_date,created_userid,updated_date,updated_userid FROM discipline ORDER BY discipline_id",
    ),
    before,
  );
  console.log(
    "PASS: admin security, discipline API CRUD, single-journal deletion clears its reference, no Add Discipline buttons, disabled Discipline delete control, refresh persistence, and desktop/mobile browser workflows.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  if (userId)
    await root(
      `DELETE FROM ijcsitr.journal WHERE journal_name='${marker}'; DELETE FROM ijcsitr.discipline WHERE created_userid=${Number(userId)} AND discipline_name LIKE '${marker}%'; DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  await db.end();
  console.log("Temporary admin account and test records removed.");
}
