import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { query, db } from "../server/db.ts";
import { hashPassword } from "../server/admin-security.ts";
import { checkMultipleAffiliations } from "./author-multiple-check.mjs";
function root(sql) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
      ["--login-path=ijcsitr-migration", "--batch"],
      { windowsHide: true },
      (error) =>
        error ? reject(new Error("Test setup or cleanup failed.")) : resolve(),
    );
    child.stdin.end(sql);
  });
}
const marker = "Author check " + randomUUID(),
  username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex"),
  base = "http://127.0.0.1:4004";
const chosenAffiliation = (
  await query("SELECT * FROM affiliation ORDER BY aff_id LIMIT 1")
)[0];
const original = await query("SELECT * FROM author ORDER BY author_id");
let userId, child, browser;
try {
  await root(
    `INSERT INTO ijcsitr.users(user_name,user_password,user_created_at) VALUES ('${username}','${await hashPassword(password)}',NOW(6));`,
  );
  userId = (
    await query("SELECT user_id FROM users WHERE user_name=?", [username])
  )[0].user_id;
  child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: "4004", ADMIN_USER_ID: String(userId) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Test server startup timed out")),
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
      reject(new Error("Test server exited " + code));
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
  await call("/authors", { authenticated: false, status: 401 });
  await call("/authors", {
    method: "POST",
    body: {},
    authenticated: false,
    status: 401,
  });
  const login = await call("/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  csrf = login.data.csrfToken;
  const data = {
    first_name: marker,
    author_code: "QA-TEST",
    alternate_name: "Université Ω",
    address: "Test address, 12 Research Street",
    country: "India",
    university: "Test University",
    last_name: "Researcher",
    prefix: "Dr.",
    department: "Computer Science",
    designation: "Researcher",
    profile_views: 0,
    logo: "",
    papers_published: 3,
    status: 1,
  };
  await call("/authors", {
    method: "POST",
    body: data,
    headers: { "X-CSRF-Token": "invalid" },
    status: 403,
  });
  for (const invalid of [
    { university: "" },
    { first_name: "X".repeat(5001) },
    { profile_views: -1 },
    { papers_published: -1 },
    { papers_published: 1.5 },
  ])
    await call("/authors", {
      method: "POST",
      body: { ...data, ...invalid },
      status: 400,
    });
  const id = (
    await call("/authors", { method: "POST", body: data, status: 201 })
  ).data.id;
  const created = (await call("/authors/" + id)).data.author;
  assert.equal(created.alternate_name, "Université Ω");
  assert.equal(created.created_userid, userId);
  assert.ok(created.created_date);
  assert.equal(
    (await call("/authors?q=" + encodeURIComponent(marker))).data.total,
    1,
  );
  const first = (await call("/authors?limit=5")).data,
    second = (await call("/authors?limit=5&page=2")).data;
  assert.equal(first.authors.length, 5);
  assert.ok(
    !first.authors.some((a) =>
      second.authors.some((b) => a.author_id === b.author_id),
    ),
  );
  assert.equal(
    (await call("/authors?q=" + encodeURIComponent("' OR 1=1 --"))).data.total,
    0,
  );
  assert.equal((await call("/authors?q=%25")).data.total, 0);
  await call("/authors/" + id, {
    method: "PUT",
    body: { ...data, country: "Singapore", papers_published: 7, status: 0 },
  });
  const updated = (await call("/authors/" + id)).data.author;
  assert.equal(updated.country, "Singapore");
  assert.equal(updated.papers_published, 7);
  assert.equal(updated.status, 0);
  assert.equal(updated.updated_userid, userId);
  assert.ok(updated.updated_date);
  await call("/authors/not-a-number", { status: 400 });
  await call("/authors/999999999", { status: 404 });
  await call("/authors/999999999", {
    method: "PUT",
    body: data,
    status: 404,
  });
  await call("/authors/999999999", { method: "DELETE", status: 404 });
  const articleColumns = (await query("SHOW COLUMNS FROM article"))
    .map((row) => row.Field)
    .filter((key) => key !== "article_id");
  const expressions = articleColumns.map((key) =>
    key === "author_ids"
      ? "'[ " + id + " ]'"
      : key === "article_title"
        ? "'" + marker + "'"
        : key === "article_key"
          ? "'" + randomUUID() + "'"
          : "`" + key + "`",
  );
  await root(
    "INSERT INTO ijcsitr.article (" +
      articleColumns.map((key) => "`" + key + "`").join(",") +
      ") SELECT " +
      expressions.join(",") +
      " FROM ijcsitr.article ORDER BY article_id LIMIT 1;",
  );
  await call("/authors/" + id, { method: "DELETE", status: 409 });
  assert.equal((await call("/authors/" + id)).data.author.author_id, id);
  await root(
    "DELETE FROM ijcsitr.article WHERE article_title='" + marker + "';",
  );
  await call("/authors/" + id, { method: "DELETE" });
  await call("/authors", {
    method: "POST",
    body: { ...data, email: "not-an-email" },
    status: 400,
  });
  await call("/authors", {
    method: "POST",
    body: { ...data, affiliation_id: 999999999 },
    status: 400,
  });
  const linkedId = (
    await call("/authors", {
      method: "POST",
      body: {
        ...data,
        author_code: "",
        affiliation_id: chosenAffiliation.aff_id,
        email: "stored@example.invalid",
      },
      status: 201,
    })
  ).data.id;
  const linked = (await call("/authors/" + linkedId)).data.author;
  assert.equal(linked.affiliation_id, chosenAffiliation.aff_id);
  assert.equal(linked.university, chosenAffiliation.aff_name);
  assert.equal(linked.email, "stored@example.invalid");
  assert.equal(linked.author_code, String(linkedId).padStart(10, "0"));
  await call("/authors/" + linkedId, { method: "DELETE" });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync(".local/screenshots", { recursive: true });
  await page.goto(base + "/portal/admin/author");
  await page.waitForURL("**/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Author", exact: true })
    .click();
  await page.getByRole("heading", { name: "Author", exact: true }).waitFor();
  await page.locator(".author-data-table tbody tr").first().waitFor();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByText("Page 2 of", { exact: false }).waitFor();
  await page.getByRole("link", { name: "Add new", exact: true }).click();
  await page.waitForURL("**/portal/admin/author/add");
  await page.reload();
  await page.getByLabel("Author Full Name").fill(marker + " browser");
  await page.getByLabel("Author ID").fill("BROWSER-QA");
  await page
    .getByRole("button", { name: "Create author", exact: true })
    .click();
  await page
    .getByText("Search for and select an affiliation before saving.")
    .waitFor();
  await page
    .getByLabel("Affiliation", { exact: false })
    .fill(String(chosenAffiliation.aff_id));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .locator('[data-affiliation-id="' + chosenAffiliation.aff_id + '"]')
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Use selected affiliations" })
    .click();
  await page
    .getByLabel("Department", { exact: true })
    .fill("Research Scholar, Department of Physics");
  await page
    .getByLabel("Email", { exact: true })
    .fill("researcher@example.invalid");
  await page.getByLabel("Prefix", { exact: true }).selectOption("Dr.");
  await page
    .locator(".author-extra-details")
    .evaluate((element) => (element.open = true));
  await page.getByLabel("Papers published").fill("5");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: ".local/screenshots/admin-author-add.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create author" }).click();
  await page.waitForURL("**/portal/admin/author");
  await page.getByLabel("Search authors").fill(marker + " browser");
  await page
    .locator("tbody tr")
    .filter({ hasText: marker + " browser" })
    .waitFor();
  await page
    .getByRole("link", { name: "Edit " + marker + " browser", exact: true })
    .click();
  await page.waitForURL(/author\/edit\?id=\d+$/);
  await page.reload();
  await page.getByLabel("Email", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Author Full Name").inputValue(),
    marker + " browser",
  );
  assert.equal(
    await page.getByLabel("Email", { exact: true }).inputValue(),
    "researcher@example.invalid",
  );
  await page
    .getByLabel("Department", { exact: true })
    .fill("Updated Department");
  await page
    .getByLabel("Email", { exact: true })
    .fill("updated@example.invalid");
  await page.getByLabel("Status").selectOption("0");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL("**/portal/admin/author");
  await page.getByLabel("Search authors").fill(marker + " browser");
  await page
    .locator("tbody tr")
    .filter({ hasText: marker + " browser" })
    .waitFor();
  assert.equal(
    (
      await query("SELECT email FROM author WHERE first_name=?", [
        marker + " browser",
      ])
    )[0].email,
    "updated@example.invalid",
  );
  await page.screenshot({
    path: ".local/screenshots/admin-author-list.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Delete " + marker + " browser", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page
    .locator("tbody tr")
    .filter({ hasText: marker + " browser" })
    .waitFor();
  assert.equal(
    (
      await query("SELECT email FROM author WHERE first_name=?", [
        marker + " browser",
      ])
    )[0].email,
    "updated@example.invalid",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Author list overflows",
  );
  await page.screenshot({
    path: ".local/screenshots/admin-author-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Edit " + marker + " browser", exact: true })
    .click();
  await page.getByLabel("Email", { exact: true }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Author edit overflows",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.waitForURL("**/portal/admin/author");
  await page.getByLabel("Search authors").fill(marker + " browser");
  await page
    .getByRole("button", { name: "Delete " + marker + " browser", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete author", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page.getByRole("heading", { name: "No matching authors" }).waitFor();
  await checkMultipleAffiliations({ page, base, marker, query, call });
  await page.goto(base + "/portal/admin/author/edit");
  await page
    .getByRole("heading", { name: "Choose an author to edit" })
    .waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(
    await query("SELECT * FROM author ORDER BY author_id"),
    original,
  );
  console.log(
    "PASS: authenticated author CRUD, CSRF, validation, Unicode persistence, audit fields, search, pagination, linked-article deletion protection, separate add/edit routes with refresh, delete confirmation/cancel, desktop/mobile pages, and original data preserved.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  if (userId)
    await root(
      `DELETE FROM ijcsitr.article WHERE article_title='${marker}'; DELETE FROM ijcsitr.author WHERE created_userid=${Number(userId)} AND first_name LIKE '${marker}%'; DELETE FROM ijcsitr.affiliation WHERE created_userid=${Number(userId)} AND aff_name LIKE '${marker}%'; DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  await db.end();
  console.log("Temporary author records and admin account removed.");
}
