import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, existsSync, readdirSync, unlinkSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { chromium } from "@playwright/test";
import { query, db } from "../server/db.ts";
import { hashPassword } from "../server/admin-security.ts";
function root(sql) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
      ["--login-path=ijcsitr-migration", "--batch"],
      { windowsHide: true },
      (error) =>
        error
          ? reject(new Error("Issue fixture setup/cleanup failed"))
          : resolve(),
    );
    child.stdin.end(sql);
  });
}
const username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex"),
  marker = "Issue check " + randomUUID(),
  base = "http://127.0.0.1:4006";
const original = await query("SELECT * FROM journal_issue ORDER BY issue_id");
const uploadedFiles = [];
let userId,
  journalId,
  child,
  browser,
  cookie = "",
  csrf = "";
try {
  await root(
    `INSERT INTO ijcsitr.users(user_name,user_password,user_created_at) VALUES ('${username}','${await hashPassword(password)}',NOW(6));`,
  );
  userId = (
    await query("SELECT user_id FROM users WHERE user_name=?", [username])
  )[0].user_id;
  await root(
    `INSERT INTO ijcsitr.journal(journal_name,journal_key,publication_frequency,start_month,start_year,created_userid,created_date) VALUES ('${marker}','${randomUUID()}','Monthly','January','2026',${Number(userId)},NOW(6));`,
  );
  journalId = (
    await query("SELECT journal_id FROM journal WHERE created_userid=?", [
      userId,
    ])
  )[0].journal_id;
  child = spawn(process.execPath, ["server/index.js"], {
    env: {
      ...process.env,
      PORT: "4006",
      ADMIN_USER_ID: String(userId),
      JOURNAL_ID: String(journalId),
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Issue test server did not start")),
      15000,
    );
    child.stdout.on("data", (value) => {
      if (value.toString().includes("IJCSITR API:")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on("error", reject);
    child.on("exit", () => {
      clearTimeout(timer);
      reject(new Error("Issue test server exited"));
    });
  });
  async function call(
    route,
    { method = "GET", body, status = 200, headers = {} } = {},
  ) {
    const response = await fetch(base + "/api/admin" + route, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Admin-Request": "1",
        Cookie: cookie,
        "X-CSRF-Token": csrf,
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
  await call("/journal-issues", { status: 401 });
  const login = await call("/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  csrf = login.data.csrfToken;
  const data = {
    year: "2026",
    volume_no: "5",
    issue_no: "1",
    title: marker,
    from_month: "January",
    to_month: "June",
    status: 1,
    special_issue: "No",
    special_issue_title: "",
    cover_image: "",
    file_path: "",
    table_of_contents: "",
  };
  await call("/journal-issues", {
    method: "POST",
    body: data,
    headers: { "X-CSRF-Token": "bad" },
    status: 403,
  });
  for (const invalid of [
    { year: "bad" },
    { volume_no: "0" },
    { from_month: "December", to_month: "January" },
    { special_issue: "Yes" },
  ])
    await call("/journal-issues", {
      method: "POST",
      body: { ...data, ...invalid },
      status: 400,
    });
  const created = await call("/journal-issues", {
      method: "POST",
      body: {
        ...data,
        journals_id: original[0].journals_id,
        created_userid: 999,
      },
      status: 201,
    }),
    id = created.data.id;
  const row = (await call("/journal-issues/" + id)).data.issue;
  assert.equal(row.journals_id, journalId);
  assert.equal(row.created_userid, userId);
  await call("/journal-issues", { method: "POST", body: data, status: 409 });
  await call("/journal-issues/" + original[0].issue_id, { status: 404 });
  await call("/journal-issues/" + original[0].issue_id, {
    method: "DELETE",
    status: 404,
  });
  assert.equal(
    (await call("/journal-issues?q=" + encodeURIComponent(marker))).data.total,
    1,
  );
  // Temporary articles exercise the legacy year/volume/issue relationship.
  await root(
    `INSERT INTO ijcsitr.article(abstract,article_key,article_title,created_date,created_userid,date_of_publication,issue,journal_id,keywords,month_from,month_to,page_from,page_to,reference,volume,year,status) VALUES ('Test','${randomUUID()}','${marker}',NOW(6),${Number(userId)},'2026-01-01','1',${Number(journalId)},'Test','January','June','1','2','Test','5','2026',0);`,
  );
  await call("/journal-issues/" + id, { method: "DELETE", status: 409 });
  await call("/journal-issues/" + id, {
    method: "PUT",
    body: { ...data, year: "2025" },
    status: 409,
  });
  await call("/journal-issues/" + id, {
    method: "PUT",
    body: { ...data, title: marker + " updated" },
  });
  assert.equal(
    (await call("/journal-issues/" + id)).data.issue.updated_userid,
    userId,
  );
  await root(
    `DELETE FROM ijcsitr.article WHERE journal_id=${Number(journalId)} AND created_userid=${Number(userId)};`,
  );
  await call("/journal-issues/" + id, { method: "DELETE" });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/portal/admin/journal-issue");
  await page.waitForURL("**/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Journal Issue", exact: true })
    .click();
  await page.getByRole("link", { name: "Add new", exact: true }).click();
  await page.getByLabel(/^Journal \*/).selectOption(String(journalId));
  await page.getByLabel("Volume No").fill("6");
  await page.getByLabel("Issue No").fill("2");
  await page.getByLabel("From Month").selectOption("January");
  await page.getByLabel("To Month").selectOption("June");
  await page.getByLabel("Year").selectOption("2026");
  await page.locator("#issue-special_issue").selectOption("Yes");
  await page.getByLabel("Special Issue Title").fill(marker);
  const cover = await sharp({
    create: { width: 100, height: 150, channels: 3, background: "#00bfae" },
  })
    .png()
    .toBuffer();
  await page
    .getByLabel("Issue File (PDF)", { exact: true })
    .setInputFiles({
      name: "issue.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nIssue fixture\n%%EOF"),
    });
  await page
    .getByLabel("Cover Image (JPG/PNG)", { exact: true })
    .setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: cover });
  mkdirSync(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/admin-journal-issue-add.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.waitForURL("**/portal/admin/journal-issue");
  await page
    .locator(".issue-data-table")
    .getByRole("link", { name: /Edit issue/ })
    .waitFor();
  const uploadedIssue = (await call("/journal-issues")).data.issues[0];
  for (const [field, type] of [
    ["file_path", "application/pdf"],
    ["cover_image", "image/webp"],
  ]) {
    const url = uploadedIssue[field];
    assert.match(
      url,
      /^\/api\/admin\/journal-issues\/files\/[a-f0-9-]{36}\.(pdf|webp)$/,
    );
    uploadedFiles.push(path.basename(url));
    const response = await fetch(base + url, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), new RegExp(type));
    assert.equal((await fetch(base + url)).status, 401);
  }
  const beforeFiles = readdirSync("uploads/journal-issues").sort();
  for (const [field, fileName, mimeType, buffer] of [
    ["issue_file", "invalid.pdf", "application/pdf", Buffer.from("fake PDF")],
    ["cover_file", "invalid.png", "image/png", Buffer.from("fake PNG")],
  ]) {
    const body = new FormData();
    body.append("data", JSON.stringify({ ...data, issue_no: "9" }));
    body.append(field, new Blob([buffer], { type: mimeType }), fileName);
    const response = await fetch(base + "/api/admin/journal-issues", {
      method: "POST",
      headers: { Cookie: cookie, "X-CSRF-Token": csrf, "X-Admin-Request": "1" },
      body,
    });
    assert.equal(response.status, 400);
  }
  assert.deepEqual(readdirSync("uploads/journal-issues").sort(), beforeFiles);
  for (const header of [
    "S.No",
    "Volume No",
    "Issue No",
    "From Month",
    "To Month",
    "Year",
    "Special Issue",
    "Created User ID",
    "Created Date",
    "Updated User ID",
    "Updated Date",
    "Status",
  ])
    await page
      .getByRole("columnheader", { name: header, exact: true })
      .waitFor();
  await page
    .getByRole("checkbox", {
      name: "Select all issues on this page",
      exact: true,
    })
    .check();
  assert.equal(
    await page.getByRole("checkbox", { name: /Select issue / }).isChecked(),
    true,
  );
  await page
    .getByRole("button", { name: "Clear selection", exact: true })
    .click();
  assert.equal(
    await page.getByRole("checkbox", { name: /Select issue / }).isChecked(),
    false,
  );
  const pagingIds = [];
  for (let index = 1; index <= 6; index++)
    pagingIds.push(
      (
        await call("/journal-issues", {
          method: "POST",
          body: {
            ...data,
            year: "2017",
            volume_no: "1",
            issue_no: String(index),
          },
          status: 201,
        })
      ).data.id,
    );
  await page.reload();
  await page
    .getByText("Showing 1 to 6 of 7 journal issues", { exact: true })
    .waitFor();
  assert.equal(await page.locator(".issue-data-table tbody tr").count(), 6);
  await page
    .getByRole("checkbox", {
      name: "Select issue " + pagingIds[0],
      exact: true,
    })
    .check();
  assert.equal(
    await page
      .getByRole("checkbox", {
        name: "Select all issues on this page",
        exact: true,
      })
      .evaluate((input) => input.indeterminate),
    true,
  );
  mkdirSync(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/admin-journal-issue-table.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page
    .getByText("Showing 7 to 7 of 7 journal issues", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .locator(".issue-data-table tbody tr")
      .first()
      .locator("td")
      .nth(1)
      .textContent(),
    "7",
  );
  assert.equal(
    await page.getByRole("checkbox", { name: /Select issue / }).isChecked(),
    false,
  );
  await page
    .getByRole("button", { name: "Previous page", exact: true })
    .click();
  await page
    .getByText("Showing 1 to 6 of 7 journal issues", { exact: true })
    .waitFor();
  for (const issueId of pagingIds)
    await call("/journal-issues/" + issueId, { method: "DELETE" });
  await page.reload();
  await page
    .getByText("Showing 1 to 1 of 1 journal issues", { exact: true })
    .waitFor();
  await page.getByLabel("Search journal issues").fill(marker);
  await page.locator(".issue-data-table tbody tr").waitFor();
  await page.getByRole("link", { name: /Edit issue/ }).click();
  await page.waitForURL(/journal-issue\/edit\?id=\d+$/);
  await page.reload();
  await page.getByLabel("Title", { exact: true }).fill(marker + " Browser");
  mkdirSync(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/admin-journal-issue-edit.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await page.waitForURL("**/portal/admin/journal-issue");
  await page.getByRole("link", { name: /Edit issue/ }).waitFor();
  assert.equal(
    (await call("/journal-issues")).data.issues[0].title,
    marker + " Browser",
  );
  await page.getByRole("link", { name: /Edit issue/ }).click();
  await page.getByLabel("Title", { exact: true }).fill("Unsaved");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.waitForURL("**/portal/admin/journal-issue");
  await page.getByRole("link", { name: /Edit issue/ }).waitFor();
  assert.equal(
    (await call("/journal-issues")).data.issues[0].title,
    marker + " Browser",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.getByRole("link", { name: /Edit issue/ }).click();
  await page.getByLabel("Title", { exact: true }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: ".local/screenshots/admin-journal-issue-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.getByRole("button", { name: /Delete issue/ }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  assert.equal((await call("/journal-issues")).data.total, 1);
  await page.getByRole("button", { name: /Delete issue/ }).click();
  await page
    .getByRole("button", { name: "Delete journal issue", exact: true })
    .click();
  await page.getByRole("heading", { name: "No journal issues yet" }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(
    await query(
      "SELECT * FROM journal_issue WHERE journals_id<>? ORDER BY issue_id",
      [journalId],
    ),
    original,
  );
  console.log(
    "PASS: journal issue CRUD, auth/CSRF, validation, duplicate detection, single-journal scope, article guards, audit fields, search, separate pages, save/cancel, delete confirmation, mobile layout; original issues unchanged.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  if (journalId) {
    const rows = await query(
      "SELECT file_path,cover_image FROM journal_issue WHERE journals_id=?",
      [journalId],
    );
    for (const row of rows)
      for (const value of [row.file_path, row.cover_image])
        if (
          /^\/api\/admin\/journal-issues\/files\/[a-f0-9-]{36}\.(pdf|webp)$/.test(
            value || "",
          )
        )
          uploadedFiles.push(path.basename(value));
  }
  const uploadDirectory = path.resolve("uploads/journal-issues");
  for (const filename of new Set(uploadedFiles)) {
    const target = path.resolve(uploadDirectory, filename);
    assert.equal(path.dirname(target), uploadDirectory);
    if (existsSync(target)) unlinkSync(target);
  }
  if (journalId) {
    await root(
      `DELETE FROM ijcsitr.article WHERE journal_id=${Number(journalId)} AND created_userid=${Number(userId)}; DELETE FROM ijcsitr.journal_issue WHERE journals_id=${Number(journalId)}; DELETE FROM ijcsitr.journal WHERE journal_id=${Number(journalId)} AND created_userid=${Number(userId)};`,
    );
  }
  if (userId)
    await root(
      `DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  await db.end();
  console.log("Temporary issue test records and account removed.");
}
