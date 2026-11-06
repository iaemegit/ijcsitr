import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdirSync, unlinkSync } from "node:fs";
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from "@playwright/test";
import { db, query } from "../server/db.ts";
import { hashPassword } from "../server/admin-security.ts";
function root(sql) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
      ["--login-path=ijcsitr-migration", "--batch"],
      { windowsHide: true },
      (error) =>
        error
          ? reject(new Error("Journal test setup or cleanup failed."))
          : resolve(),
    );
    child.stdin.end(sql);
  });
}
const marker = "Journal check " + randomUUID(),
  key = randomUUID(),
  username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex"),
  base = "http://127.0.0.1:4005";
const original = await query("SELECT * FROM journal ORDER BY journal_id");
let userId, journalId, child, browser, uploadedCover;
try {
  await root(
    `INSERT INTO ijcsitr.users(user_name,user_password,user_created_at) VALUES ('${username}','${await hashPassword(password)}',NOW(6));`,
  );
  userId = (
    await query("SELECT user_id FROM users WHERE user_name=?", [username])
  )[0].user_id;
  await root(
    `INSERT INTO ijcsitr.journal(journal_name,journal_key,publication_frequency,start_month,start_year,created_userid,created_date) VALUES ('${marker}','${key}','Quarterly','January','2020',${Number(userId)},NOW(6));`,
  );
  journalId = (
    await query("SELECT journal_id FROM journal WHERE journal_key=?", [key])
  )[0].journal_id;
  child = spawn(process.execPath, ["server/index.js"], {
    env: {
      ...process.env,
      PORT: "4005",
      ADMIN_USER_ID: String(userId),
      JOURNAL_ID: String(journalId),
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Journal test API did not start")),
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
      reject(new Error("Journal test API exited " + code));
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
  await call("/journal", { authenticated: false, status: 401 });
  await call("/journal", {
    method: "PUT",
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
  let current = (await call("/journal")).data;
  assert.equal(current.journal.journal_id, journalId);
  const data = {
    ...current.journal,
    journal_name: marker + " API",
    discipline_id: null,
    status: null,
    email: "journal@example.invalid",
    about_us: "<p>Original journal description</p>",
    subject_area: "Computer science",
  };
  await call("/journal", {
    method: "PUT",
    body: data,
    headers: { "X-CSRF-Token": "wrong" },
    status: 403,
  });
  for (const invalid of [
    { journal_name: "" },
    { journal_key: "" },
    { email: "invalid" },
    { start_year: "20xx" },
    { discipline_id: 999999999 },
  ])
    await call("/journal", {
      method: "PUT",
      body: { ...data, ...invalid },
      status: 400,
    });
  await call("/journal", { method: "POST", body: data, status: 405 });
  await call("/journal", { method: "DELETE", status: 405 });
  await call("/journal", {
    method: "PUT",
    body: { ...data, journal_id: original[0].journal_id },
  });
  current = (await call("/journal")).data;
  assert.equal(current.journal.journal_id, journalId);
  assert.equal(current.journal.journal_name, data.journal_name);
  assert.equal(current.journal.updated_userid, userId);
  assert.equal(current.journal.status, null);
  assert.equal(current.journal.discipline_id, null);
  // Exercise the larger journal request allowance without touching the real journal.
  await call("/journal", {
    method: "PUT",
    body: {
      ...data,
      about_us: "A".repeat(20000),
      subject_area: "B".repeat(20000),
    },
  });
  assert.equal((await call("/journal")).data.journal.about_us.length, 20000);
  await call("/journal", { method: "PUT", body: data });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync(".local/screenshots", { recursive: true });
  await page.goto(base + "/portal/admin/journal");
  await page.waitForURL("**/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Journal", exact: true })
    .click();
  await page.locator(".journal-data-table tbody tr").waitFor();
  assert.equal(await page.locator(".journal-data-table tbody tr").count(), 1);
  assert.equal(
    await page.getByRole("link", { name: /Add new|Delete/ }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: /Add new|Delete/ }).count(),
    0,
  );
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await page.waitForURL("**/portal/admin/journal/edit");
  await page.reload();
  await page.getByLabel("Journal Name").waitFor();
  assert.equal(
    await page.getByLabel("Journal Name").inputValue(),
    data.journal_name,
  );
  await page.getByLabel("Journal Name").fill(marker + " Browser");
  await page.getByLabel("Abbreviation", { exact: true }).fill("TEST-JOURNAL");
  await page.getByLabel("Email", {exact:true}).fill("editor@example.invalid");
  await page
    .getByRole('textbox', {name:'About Us',exact:true})
    .fill("Updated description from the edit page.");
  await page.getByLabel(/^Discipline/).selectOption(String(current.disciplines[0].discipline_id));
  await page.getByRole('textbox', {name:'About Us',exact:true}).press('Control+a');
  await page.getByRole('toolbar', {name:'About Us formatting'}).getByRole('button', {name:'Bold',exact:true}).click();
  const png = await sharp({create:{width:100,height:150,channels:3,background:'#00bfae'}}).png().toBuffer();
  await page.getByLabel('Cover Image', {exact:true}).setInputFiles({name:'cover.png',mimeType:'image/png',buffer:png});
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: ".local/screenshots/admin-journal-edit.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Save", exact:true }).click();
  await page.waitForURL("**/portal/admin/journal");
  await page
    .getByRole("cell", { name: marker + " Browser", exact: false })
    .waitFor();
  current = (await call("/journal")).data;
  assert.equal(current.journal.email, "editor@example.invalid");
  assert.equal(current.journal.abbrevation, "TEST-JOURNAL");
  assert.equal(current.journal.status, null);
  assert.match(current.journal.about_us, /<strong>Updated description from the edit page\.<\/strong>/);
  uploadedCover = current.journal.cover_page;
  assert.match(uploadedCover, /^\/media\/journal-covers\/[a-f0-9-]+\.webp$/);
  const imageResponse = await fetch(base + uploadedCover);
  assert.equal(imageResponse.status, 200);
  assert.match(imageResponse.headers.get('content-type'), /image\/webp/);
  const invalidUpload = new FormData();
  invalidUpload.append('data', JSON.stringify(current.journal));
  invalidUpload.append('cover_image', new Blob(['fake image'],{type:'image/png'}), 'fake.png');
  const rejected = await fetch(base+'/api/admin/journal',{method:'PUT',headers:{Cookie:cookie,'X-CSRF-Token':csrf,'X-Admin-Request':'1'},body:invalidUpload});
  assert.equal(rejected.status,400);
  assert.equal((await call('/journal')).data.journal.cover_page,uploadedCover);
  await page.screenshot({
    path: ".local/screenshots/admin-journal-list.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await page.getByLabel("Journal Name").waitFor();
  await page.getByLabel("Journal Name").fill("Unsaved change");
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.waitForURL("**/portal/admin/journal");
  assert.equal(
    (await call("/journal")).data.journal.journal_name,
    marker + " Browser",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Journal overview overflows",
  );
  await page.getByRole("link", { name: "Edit", exact: true }).click();
  await page.getByLabel("Journal Name").waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Journal form overflows",
  );
  await page.screenshot({
    path: ".local/screenshots/admin-journal-mobile.png",
    fullPage: true,
  });
  await page.goto(base + "/portal/admin/journal/add");
  await page.getByRole("heading", { name: "Admin page not found" }).waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(
    await query(
      "SELECT * FROM journal WHERE journal_id<>? ORDER BY journal_id",
      [journalId],
    ),
    original,
  );
  console.log(
    "PASS: edit-only single journal, protected API, no add/delete, validation, large descriptions, audit fields, direct edit refresh, save/cancel, desktop/mobile layout, and original journal data preserved.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  if (journalId) {
    const row = (await query('SELECT cover_page FROM journal WHERE journal_id=?',[journalId]))[0];
    if (/^\/media\/journal-covers\/[a-f0-9-]+\.webp$/.test(row?.cover_page || '')) {
      const directory = path.resolve('uploads/journal-covers');
      const target = path.resolve(directory,path.basename(row.cover_page));
      assert.equal(path.dirname(target), directory);
      unlinkSync(target);
    }
  }
  if (journalId)
    await root(
      `DELETE FROM ijcsitr.journal WHERE journal_id=${Number(journalId)} AND created_userid=${Number(userId)};`,
    );
  if (userId)
    await root(
      `DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  await db.end();
  console.log("Temporary journal and admin account removed.");
}
