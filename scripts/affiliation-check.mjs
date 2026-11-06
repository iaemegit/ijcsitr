import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { query, db } from "../server/db.ts";
import { hashPassword } from "../server/admin-security.ts";
import sharp from "sharp";
import { removeUnusedAffiliationLogo } from "../server/affiliation-upload.ts";
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
const marker = "Affiliation check " + randomUUID(),
  username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex"),
  base = "http://127.0.0.1:4003";
const original = await query("SELECT * FROM affiliation ORDER BY aff_id");
let userId, child, browser;
try {
  await root(
    `INSERT INTO ijcsitr.users(user_name,user_password,user_created_at) VALUES ('${username}','${await hashPassword(password)}',NOW(6));`,
  );
  userId = (
    await query("SELECT user_id FROM users WHERE user_name=?", [username])
  )[0].user_id;
  child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: "4003", ADMIN_USER_ID: String(userId) },
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
  await call("/affiliations", { authenticated: false, status: 401 });
  await call("/affiliations", {
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
    aff_name: marker,
    aff_code: "QA-TEST",
    alternate_name: "Université Ω",
    address: "Test address, 12 Research Street",
    country: "India",
    website: "https://example.invalid",
    logo: "",
    papers_published: 3,
    status: 1,
  };
  await call("/affiliations", {
    method: "POST",
    body: data,
    headers: { "X-CSRF-Token": "invalid" },
    status: 403,
  });
  for (const invalid of [
    { country: "" },
    { aff_name: "X".repeat(256) },
    { website: "javascript:alert(1)" },
    { papers_published: -1 },
    { papers_published: 1.5 },
  ])
    await call("/affiliations", {
      method: "POST",
      body: { ...data, ...invalid },
      status: 400,
    });
  const id = (
    await call("/affiliations", { method: "POST", body: data, status: 201 })
  ).data.id;
  const created = (await call("/affiliations/" + id)).data.affiliation;
  assert.equal(created.alternate_name, "Université Ω");
  assert.equal(created.created_userid, userId);
  assert.ok(created.created_date);
  assert.equal(
    (await call("/affiliations?q=" + encodeURIComponent(marker))).data.total,
    1,
  );
  const first = (await call("/affiliations?limit=5")).data,
    second = (await call("/affiliations?limit=5&page=2")).data;
  assert.equal(first.affiliations.length, 5);
  assert.ok(
    !first.affiliations.some((a) =>
      second.affiliations.some((b) => a.aff_id === b.aff_id),
    ),
  );
  assert.equal(
    (await call("/affiliations?q=" + encodeURIComponent("' OR 1=1 --"))).data
      .total,
    0,
  );
  assert.equal((await call("/affiliations?q=%25")).data.total, 0);
  await call("/affiliations/" + id, {
    method: "PUT",
    body: { ...data, country: "Singapore", papers_published: 7, status: 0 },
  });
  const updated = (await call("/affiliations/" + id)).data.affiliation;
  assert.equal(updated.country, "Singapore");
  assert.equal(updated.papers_published, 7);
  assert.equal(updated.status, 0);
  assert.equal(updated.updated_userid, userId);
  assert.ok(updated.updated_date);
  await call("/affiliations/not-a-number", { status: 400 });
  await call("/affiliations/999999999", { status: 404 });
  await call("/affiliations/999999999", {
    method: "PUT",
    body: data,
    status: 404,
  });
  await call("/affiliations/999999999", { method: "DELETE", status: 404 });
  await call("/affiliations/" + id, { method: "DELETE" });
  const linkedId = (
    await call("/affiliations", {
      method: "POST",
      body: { ...data, aff_name: marker + " linked" },
      status: 201,
    })
  ).data.id;
  await root(
    `INSERT INTO ijcsitr.author(first_name,last_name,address,university,affiliation_id,created_date,created_userid) VALUES ('Primary','Link Test','Test','Test',${Number(linkedId)},NOW(6),${Number(userId)}),('Secondary','Link Test','Test','Test',NULL,NOW(6),${Number(userId)});`,
  );
  const linkedAuthors = await query(
    "SELECT author_id,first_name FROM author WHERE created_userid=? ORDER BY author_id",
    [userId],
  );
  await root(
    `INSERT INTO ijcsitr.author_affiliation(author_id,affiliation_id,department,display_order) VALUES (${Number(linkedAuthors[1].author_id)},${Number(linkedId)},'Test',1);`,
  );
  const journalId = (
    await query("SELECT journal_id FROM journal ORDER BY journal_id LIMIT 1")
  )[0].journal_id;
  await root(
    `INSERT INTO ijcsitr.article(abstract,article_key,article_title,author_ids,created_date,created_userid,date_of_publication,issue,journal_id,keywords,month_from,month_to,page_from,page_to,reference,volume,year,status) VALUES ('Test','${randomUUID()}','${marker}','[${Number(linkedAuthors[0].author_id)}]',NOW(6),${Number(userId)},'2026-01-01','1',${Number(journalId)},'Test','January','June','1','2','Test','1','2026',0);`,
  );
  const linkedArticle = (
    await query("SELECT article_id FROM article WHERE created_userid=?", [
      userId,
    ])
  )[0].article_id;
  const usage = (await call("/affiliations/" + linkedId + "/links")).data;
  assert.equal(usage.can_delete, false);
  assert.equal(usage.authors.length, 2);
  assert.deepEqual(usage.authors[0].article_ids, [linkedArticle]);
  assert.deepEqual(usage.authors[1].article_ids, []);
  assert.equal(usage.authors[0].name, "Primary Link Test");
  assert.equal(
    (await call("/affiliations?q=" + linkedId)).data.affiliations[0]
      .author_count,
    2,
  );
  await call("/affiliations/" + linkedId, { method: "DELETE", status: 409 });
  await call("/affiliations/" + linkedId + "/links", {
    authenticated: false,
    status: 401,
  });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync(".local/screenshots", { recursive: true });
  await page.goto(base + "/portal/admin/affiliation");
  await page.waitForURL("**/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Affiliation", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Affiliation", exact: true })
    .waitFor();
  await page.locator(".affiliation-data-table tbody tr").first().waitFor();
  await page.getByLabel("Search affiliations").fill(marker + " linked");
  await page
    .getByRole("button", {
      name: "View links for " + marker + " linked",
      exact: true,
    })
    .click();
  const usageDialog = page.getByRole("dialog");
  await usageDialog
    .getByRole("heading", { name: "Affiliation is in use", exact: true })
    .waitFor();
  await usageDialog
    .getByRole("cell", { name: "Primary Link Test", exact: true })
    .waitFor();
  await usageDialog
    .getByRole("cell", {
      name: String(linkedAuthors[0].author_id),
      exact: true,
    })
    .waitFor();
  await usageDialog
    .getByRole("cell", { name: String(linkedArticle), exact: true })
    .waitFor();
  await usageDialog
    .getByRole("cell", { name: "Secondary Link Test", exact: true })
    .waitFor();
  assert.equal(
    await usageDialog.getByRole("button", { name: /Delete/ }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", {
        name: "Delete " + marker + " linked",
        exact: true,
      })
      .count(),
    0,
  );
  await page.screenshot({
    path: ".local/screenshots/admin-affiliation-links.png",
    fullPage: true,
  });
  await usageDialog.getByRole("button", { name: "Close", exact: true }).click();
  await root(
    `DELETE FROM ijcsitr.article WHERE created_userid=${Number(userId)}; DELETE FROM ijcsitr.author WHERE created_userid=${Number(userId)}; DELETE FROM ijcsitr.affiliation WHERE aff_id=${Number(linkedId)} AND created_userid=${Number(userId)};`,
  );
  await page.reload();
  await page.locator(".affiliation-data-table tbody tr").first().waitFor();
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByText("Page 2 of", { exact: false }).waitFor();
  await page.getByRole("link", { name: "Add new", exact: true }).click();
  await page.waitForURL("**/portal/admin/affiliation/add");
  await page.reload();
  await page.getByLabel("Affiliation name").fill(marker + " browser");
  await page.getByLabel("Affiliation code").fill("BROWSER-QA");
  assert.equal(
    await page.getByLabel("Address", { exact: true }).getAttribute("required"),
    null,
  );
  assert.ok(
    (await page.getByLabel("Country").locator("option").count()) >= 250,
  );
  await page.getByLabel("Country").selectOption("India");
  await page
    .getByLabel("Website", { exact: true })
    .fill("https://example.invalid");
  assert.equal(await page.getByLabel("Papers published").count(), 0);
  assert.equal(await page.getByLabel("Logo URL or path").count(), 0);
  const invalidLogo = new FormData();
  invalidLogo.append(
    "data",
    JSON.stringify({ ...data, aff_name: marker + " invalid upload" }),
  );
  invalidLogo.append(
    "logo_file",
    new Blob(["invalid image"], { type: "image/png" }),
    "fake.png",
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/affiliations", {
        method: "POST",
        headers: {
          Cookie: cookie,
          "X-CSRF-Token": csrf,
          "X-Admin-Request": "1",
        },
        body: invalidLogo,
      })
    ).status,
    400,
  );
  await page.getByLabel("Upload Logo", { exact: true }).setInputFiles({
    name: "logo.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 32, height: 32, channels: 4, background: "#087f8c" },
    })
      .png()
      .toBuffer(),
  });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({
    path: ".local/screenshots/admin-affiliation-add.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Create affiliation" }).click();
  await page.waitForURL("**/portal/admin/affiliation");
  await page.getByLabel("Search affiliations").fill(marker + " browser");
  await page
    .locator("tbody tr")
    .filter({ hasText: marker + " browser" })
    .waitFor();
  const noAddressAffiliation = (
    await call("/affiliations?q=" + encodeURIComponent(marker + " browser"))
  ).data.affiliations[0];
  assert.equal(noAddressAffiliation.address, "");
  assert.equal(noAddressAffiliation.papers_published, 0);
  assert.match(
    noAddressAffiliation.logo,
    /^\/api\/admin\/affiliations\/logos\/[a-f0-9-]{36}\.webp$/,
  );
  assert.equal((await fetch(base + noAddressAffiliation.logo)).status, 401);
  const logoResponse = await fetch(base + noAddressAffiliation.logo, {
    headers: { Cookie: cookie },
  });
  assert.equal(logoResponse.status, 200);
  assert.equal(
    (await sharp(Buffer.from(await logoResponse.arrayBuffer())).metadata())
      .format,
    "webp",
  );
  await call("/affiliations/" + noAddressAffiliation.aff_id, {
    method: "PUT",
    body: { ...noAddressAffiliation, papers_published: 7 },
  });
  const noAddressAuthor = (
    await call("/authors", {
      method: "POST",
      body: {
        first_name: marker + " optional address",
        affiliation_id: noAddressAffiliation.aff_id,
        papers_published: 0,
        profile_views: 0,
        status: 1,
      },
      status: 201,
    })
  ).data.id;
  assert.equal(
    (await call("/authors/" + noAddressAuthor)).data.author.address,
    "",
  );
  await call("/authors/" + noAddressAuthor, { method: "DELETE" });
  await page
    .getByRole("link", { name: "Edit " + marker + " browser", exact: true })
    .click();
  await page.waitForURL(/affiliation\/edit\?id=\d+$/);
  await page.reload();
  await page.getByLabel("Country").waitFor();
  assert.equal(
    await page.getByLabel("Affiliation name").inputValue(),
    marker + " browser",
  );
  assert.equal(await page.getByLabel("Country").inputValue(), "India");
  await page.getByLabel("Country").selectOption("Singapore");
  await page.getByLabel("Status").selectOption("0");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL("**/portal/admin/affiliation");
  await page.getByLabel("Search affiliations").fill(marker + " browser");
  await page.getByRole("cell", { name: "Singapore", exact: true }).waitFor();
  const savedAffiliation = (
    await call("/affiliations/" + noAddressAffiliation.aff_id)
  ).data.affiliation;
  assert.equal(savedAffiliation.papers_published, 7);
  assert.equal(savedAffiliation.logo, noAddressAffiliation.logo);
  await page.screenshot({
    path: ".local/screenshots/admin-affiliation-list.png",
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
  await page.getByRole("cell", { name: "Singapore", exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Affiliation list overflows",
  );
  await page.screenshot({
    path: ".local/screenshots/admin-affiliation-mobile.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Edit " + marker + " browser", exact: true })
    .click();
  await page.getByLabel("Country").waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "Affiliation edit overflows",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.waitForURL("**/portal/admin/affiliation");
  await page.getByLabel("Search affiliations").fill(marker + " browser");
  await page
    .getByRole("button", { name: "Delete " + marker + " browser", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Delete affiliation", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "detached" });
  await page
    .getByRole("heading", { name: "No matching affiliations" })
    .waitFor();
  assert.equal(
    (
      await fetch(base + noAddressAffiliation.logo, {
        headers: { Cookie: cookie },
      })
    ).status,
    404,
  );
  await page.goto(base + "/portal/admin/affiliation/add");
  assert.equal(
    await page.getByLabel("Affiliation name").getAttribute("required"),
    null,
  );
  await page.getByLabel("Affiliation code").fill(marker + " country-only");
  await page.getByLabel("Country").selectOption("India");
  await page
    .getByRole("button", { name: "Create affiliation", exact: true })
    .click();
  await page.waitForURL("**/portal/admin/affiliation");
  const countryOnly = (
    await call(
      "/affiliations?q=" + encodeURIComponent(marker + " country-only"),
    )
  ).data.affiliations[0];
  assert.equal(countryOnly.aff_name, "");
  assert.equal(countryOnly.address, "");
  assert.equal(countryOnly.country, "India");
  await page.getByLabel("Search affiliations").fill(marker + " country-only");
  await page.getByText("India (country only)", { exact: true }).waitFor();
  await page.goto(base + "/portal/admin/author/add");
  await page
    .getByLabel("Author Full Name")
    .fill(marker + " country-only author");
  await page
    .getByLabel("Affiliation", { exact: false })
    .fill(String(countryOnly.aff_id));
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await page
    .getByRole("checkbox", { name: "Select India (country only)", exact: true })
    .check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Use selected affiliations" })
    .click();
  await page
    .locator(".author-selected-affiliation")
    .locator("strong")
    .filter({ hasText: "India (country only)" })
    .waitFor();
  await page
    .getByRole("button", { name: "Create author", exact: true })
    .click();
  await page.waitForURL("**/portal/admin/author");
  const countryAuthor = (
    await call(
      "/authors?q=" + encodeURIComponent(marker + " country-only author"),
    )
  ).data.authors[0];
  assert.equal(countryAuthor.affiliation_id, countryOnly.aff_id);
  assert.equal(countryAuthor.university, "");
  assert.equal(countryAuthor.country, "India");
  await page.goto(
    base + "/portal/admin/author/edit?id=" + countryAuthor.author_id,
  );
  await page
    .locator(".author-selected-affiliation")
    .locator("strong")
    .filter({ hasText: "India (country only)" })
    .waitFor();
  await call("/authors/" + countryAuthor.author_id, { method: "DELETE" });
  await call("/affiliations/" + countryOnly.aff_id, { method: "DELETE" });
  await page.goto(base + "/portal/admin/affiliation/edit");
  await page
    .getByRole("heading", { name: "Choose an affiliation to edit" })
    .waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(
    await query("SELECT * FROM affiliation ORDER BY aff_id"),
    original,
  );
  console.log(
    "PASS: affiliation CRUD, primary/secondary author links, article IDs in warning popup, no linked Delete action, API deletion protection, auth/CSRF, validation, search, pagination, separate pages, desktop/mobile, and original data preserved.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  const testLogos = userId
    ? await query("SELECT logo FROM affiliation WHERE created_userid=?", [
        userId,
      ])
    : [];
  if (userId)
    await root(
      `DELETE FROM ijcsitr.article WHERE created_userid=${Number(userId)}; DELETE FROM ijcsitr.author WHERE created_userid=${Number(userId)}; DELETE FROM ijcsitr.affiliation WHERE created_userid=${Number(userId)} AND (aff_name LIKE '${marker}%' OR aff_code='${marker} country-only'); DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  for (const row of testLogos) await removeUnusedAffiliationLogo(row.logo);
  await db.end();
  console.log("Temporary affiliation records and admin account removed.");
}
