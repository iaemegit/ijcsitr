import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdirSync, existsSync, unlinkSync } from "node:fs";
import path from "node:path";
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
          ? reject(new Error("Article fixture setup/cleanup failed"))
          : resolve(),
    );
    child.stdin.end(sql);
  });
}
const readOnly = process.argv.includes("--read-only"),
  marker = "Article check " + randomUUID(),
  username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex"),
  base = "http://127.0.0.1:4007",
  original = await query("SELECT * FROM article ORDER BY article_id");
let userId,
  journalId,
  child,
  browser,
  cookie = "",
  csrf = "";
const uploadedFiles = [];
try {
  await root(
    `INSERT INTO ijcsitr.users(user_name,user_password,user_created_at) VALUES ('${username}','${await hashPassword(password)}',NOW(6));`,
  );
  userId = (
    await query("SELECT user_id FROM users WHERE user_name=?", [username])
  )[0].user_id;
  if (!readOnly) {
    await root(
      `INSERT INTO ijcsitr.journal(journal_name,journal_key,publication_frequency,start_month,start_year,created_userid,created_date) VALUES ('${marker}','${randomUUID()}','Monthly','January','2026',${Number(userId)},NOW(6));`,
    );
    journalId = (
      await query("SELECT journal_id FROM journal WHERE created_userid=?", [
        userId,
      ])
    )[0].journal_id;
  }
  child = spawn(process.execPath, ["server/index.js"], {
    env: {
      ...process.env,
      PORT: "4007",
      ADMIN_USER_ID: String(userId),
      ...(journalId ? { JOURNAL_ID: String(journalId) } : {}),
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Article test server did not start")),
      20000,
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
      reject(new Error("Article test server exited " + code));
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
  await call("/articles", { status: 401 });
  await call("/articles/options", { status: 401 });
  const login = await call("/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  csrf = login.data.csrfToken;
  const authors = await query(
    "SELECT author_id,first_name,last_name FROM author ORDER BY author_id LIMIT 2",
  );
  let issueId, apiId;
  const data = {
    article_title: marker + " API",
    article_key: marker,
    issue_id: null,
    author_ids: authors.map((author) => author.author_id),
    corresponding_author: String(authors[0].author_id),
    abstract: "An abstract describing a temporary article used for validation.",
    keywords: "temporary; validation",
    reference: "Temporary reference",
    date_of_publication: "2026-06-15",
    date_of_received: "2026-05-01",
    date_of_acceptance: "2026-06-01",
    page_from: "1",
    page_to: "12",
    status: 0,
    article_file: "https://example.org/temporary-article.pdf",
  };
  if (!readOnly) {
    issueId = (
      await call("/journal-issues", {
        method: "POST",
        body: {
          year: "2026",
          volume_no: "8",
          issue_no: "2",
          from_month: "January",
          to_month: "June",
          special_issue: "No",
          status: 1,
        },
        status: 201,
      })
    ).data.id;
    data.issue_id = issueId;
    await call("/articles", {
      method: "POST",
      body: data,
      headers: { "X-CSRF-Token": "wrong" },
      status: 403,
    });
    for (const invalid of [
      { article_title: "x" },
      { author_ids: [] },
      { author_ids: [authors[0].author_id, authors[0].author_id] },
      { author_ids: [999999999] },
      { issue_id: 999999999 },
      { date_of_publication: "2026-02-30" },
      { page_from: "20", page_to: "10" },
      { corresponding_author: "999" },
    ])
      await call("/articles", {
        method: "POST",
        body: { ...data, ...invalid },
        status: 400,
      });
    apiId = (
      await call("/articles", {
        method: "POST",
        body: {
          ...data,
          journal_id: original[0].journal_id,
          views: 999,
          created_userid: 999,
        },
        status: 201,
      })
    ).data.id;
    const row = (await call("/articles/" + apiId)).data.article;
    assert.equal(row.journal_id, journalId);
    assert.equal(row.created_userid, userId);
    assert.equal(row.views, 0);
    assert.equal(row.issue_id, issueId);
    assert.deepEqual(row.author_ids, data.author_ids);
    assert.equal((await fetch(base + "/api/articles/" + apiId)).status, 404);
    await call("/articles", { method: "POST", body: data, status: 409 });
    await call("/articles/" + original[0].article_id, {
      method: "PUT",
      body: data,
      status: 404,
    });
    await call("/articles/" + original[0].article_id, {
      method: "DELETE",
      status: 404,
    });
    await call("/articles/" + apiId, {
      method: "PUT",
      body: {
        ...data,
        article_title: marker + " updated",
        author_ids: [...data.author_ids].reverse(),
      },
    });
    assert.deepEqual(
      (await call("/articles/" + apiId)).data.article.author_ids,
      [...data.author_ids].reverse(),
    );
    assert.equal(
      (await call("/articles/" + apiId)).data.article.updated_userid,
      userId,
    );
    await call("/articles/" + apiId, { method: "DELETE" });
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  mkdirSync(".local/screenshots", { recursive: true });
  await page.goto(base + "/portal/admin/article");
  await page.waitForURL("**/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Article", exact: true })
    .click();
  await page.getByRole("heading", { name: "Article", exact: true }).waitFor();
  if (readOnly) {
    await page.locator(".article-data-table tbody tr").first().waitFor();
    assert.equal(
      await page.locator(".article-data-table tbody tr").count(),
      10,
    );
    await page.screenshot({
      path: ".local/screenshots/admin-article-list.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await page.getByText("Page 2 of", { exact: false }).waitFor();
    await page
      .getByRole("link", { name: /Edit article / })
      .first()
      .click();
    await page.waitForURL(/article\/edit\?id=\d+$/);
    await page.reload();
    await page.getByLabel("Article Title").waitFor();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL("**/portal/admin/article");
  }
  await page.getByRole("link", { name: "Add new", exact: true }).click();
  await page.getByLabel("Article Title").fill(marker + " Browser");
  await page.getByLabel("Article File (PDF)").setInputFiles({
    name: "preview-check.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.4\nPreview check\n%%EOF"),
  });
  assert.equal(
    await page
      .getByLabel("Article File (PDF)")
      .evaluate((input) => input.files[0].name),
    "preview-check.pdf",
  );
  assert.equal(
    await page.locator('iframe[title="Article PDF preview"]').count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "Upload PDF", exact: true })
      .isEnabled(),
    true,
  );
  assert.equal(
    await page.getByRole("link", { name: "Open PDF", exact: true }).count(),
    0,
  );
  await page.getByLabel("Article File (PDF)").setInputFiles([]);
  assert.equal(
    await page.locator('iframe[title="Article PDF preview"]').count(),
    0,
  );
  assert.equal(await page.getByLabel("Article File (PDF)").inputValue(), "");
  const options = (await call("/articles/options")).data;
  await page
    .getByLabel("Volume", { exact: false })
    .selectOption(
      String(
        options.issues.find(
          (issue) => issue.issue_id === (issueId || options.issues[0].issue_id),
        ).volume_no,
      ),
    );
  await page
    .getByLabel("Issue *", { exact: true })
    .selectOption(String(issueId || options.issues[0].issue_id));
  const chosenIssue = options.issues.find(
    (issue) => issue.issue_id === (issueId || options.issues[0].issue_id),
  );
  assert.equal(
    await page.getByLabel("Month From", { exact: true }).inputValue(),
    chosenIssue.from_month,
  );
  assert.equal(
    await page.getByLabel("Month To", { exact: true }).inputValue(),
    chosenIssue.to_month,
  );
  assert.equal(
    await page.getByLabel("Year", { exact: true }).inputValue(),
    chosenIssue.year,
  );
  await page.getByLabel("Publication Date").fill("2026-06-15");
  await page
    .getByRole("textbox", { name: "Abstract Text", exact: true })
    .fill(data.abstract);
  await page
    .getByRole("button", { name: "Search Authors", exact: true })
    .click();
  await page
    .getByRole("textbox", {
      name: "Search author name, institution or ID",
      exact: true,
    })
    .fill(String(authors[0].author_id));
  await page
    .getByRole("checkbox", {
      name: new RegExp("^Select author " + authors[0].author_id + ":"),
    })
    .check();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("radio", {
      name: "Corresponding author " + authors[0].author_id,
      exact: true,
    })
    .check();
  await page.screenshot({
    path: ".local/screenshots/admin-article-add.png",
    fullPage: true,
  });
  if (readOnly) {
    await page
      .getByRole("button", { name: "Search Authors", exact: true })
      .click();
    await page
      .getByLabel("Search author name, institution or ID", { exact: true })
      .fill(String(authors[1].author_id));
    await page
      .getByRole("checkbox", {
        name: new RegExp("^Select author " + authors[1].author_id + ":"),
      })
      .check();
    await page.keyboard.press("Escape");
    await page
      .getByRole("radio", {
        name: "Corresponding author " + authors[1].author_id,
        exact: true,
      })
      .check();
    assert.equal(await page.getByRole("radio", { checked: true }).count(), 1);
    await page
      .getByRole("button", {
        name: `Move author ${authors[1].author_id} up`,
        exact: true,
      })
      .click();
    assert.match(
      await page
        .locator(".article-selected-table tbody tr")
        .first()
        .innerText(),
      new RegExp("#" + authors[1].author_id),
    );
    await page
      .getByRole("button", {
        name: `Remove author ${authors[1].author_id}`,
        exact: true,
      })
      .click();
    assert.equal(await page.getByRole("radio", { checked: true }).count(), 0);
    await page
      .getByRole("textbox", { name: "Reference", exact: true })
      .fill("Reference formatting check");
    await page
      .getByRole("textbox", { name: "Reference", exact: true })
      .press("Control+a");
    await page
      .getByRole("toolbar", { name: "Reference formatting" })
      .getByRole("button", { name: "Bold", exact: true })
      .click();
    assert.match(
      await page
        .getByRole("textbox", { name: "Reference", exact: true })
        .innerHTML(),
      /<strong>/,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: ".local/screenshots/admin-article-mobile.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL("**/portal/admin/article");
  } else {
    await page.getByLabel("Article File (PDF)").setInputFiles({
      name: "article.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nTemporary article\n%%EOF"),
    });
    await page.getByRole("button", { name: "Upload PDF", exact: true }).click();
    await page.getByText("PDF uploaded. Save the article to attach it.", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.waitForURL("**/portal/admin/article");
    await page.getByText(marker + " Browser", { exact: true }).waitFor();
    const article = (await call("/articles")).data.articles[0],
      record = (await call("/articles/" + article.article_id)).data.article;
    assert.equal(record.status, 0);
    assert.match(
      record.article_file,
      /^\/index\.php\/home\/article\/view\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.pdf$/,
    );
    uploadedFiles.push(path.basename(record.article_pdf_storage));
    assert.equal((await fetch(base + record.article_file)).status, 404);
    assert.equal(
      (
        await fetch(
          base + "/api/admin/articles/" + article.article_id + "/file",
          { headers: { Cookie: cookie } },
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await fetch(
          base + "/api/admin/articles/" + article.article_id + "/file",
        )
      ).status,
      401,
    );
    const invalidUpload = new FormData();
    invalidUpload.append(
      "data",
      JSON.stringify({ ...data, article_key: randomUUID() }),
    );
    invalidUpload.append(
      "article_pdf",
      new Blob(["fake PDF"], { type: "application/pdf" }),
      "fake.pdf",
    );
    assert.equal(
      (
        await fetch(base + "/api/admin/articles", {
          method: "POST",
          headers: {
            Cookie: cookie,
            "X-CSRF-Token": csrf,
            "X-Admin-Request": "1",
          },
          body: invalidUpload,
        })
      ).status,
      400,
    );
    await page
      .getByRole("link", {
        name: "Edit article " + article.article_id,
        exact: true,
      })
      .click();
    await page.waitForURL(/article\/edit\?id=\d+$/);
    await page.reload();
    await page.getByLabel("Article Title").fill(marker + " Published");
    await page.getByLabel("Status *", { exact: true }).selectOption("1");
    await page.getByRole("button", { name: "Update", exact: true }).click();
    await page.waitForURL("**/portal/admin/article");
    await page.getByText(marker + " Published", { exact: true }).waitFor();
    assert.equal(
      (await fetch(base + "/api/articles/" + article.article_id)).status,
      200,
    );
    assert.equal((await fetch(base + record.article_file)).status, 200);
    assert.equal(
      (
        await (
          await fetch(base + "/api/articles?q=" + encodeURIComponent(marker))
        ).json()
      ).total,
      1,
    );
    const updated = (await call("/articles/" + article.article_id)).data
      .article;
    assert.equal(updated.article_file, record.article_file);
    assert.equal(updated.updated_userid, userId);
    await page
      .getByRole("link", {
        name: "Edit article " + article.article_id,
        exact: true,
      })
      .click();
    await page.getByLabel("Article Title").fill("Unsaved");
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL("**/portal/admin/article");
    assert.equal(
      (await call("/articles/" + article.article_id)).data.article
        .article_title,
      marker + " Published",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page
      .getByRole("link", {
        name: "Edit article " + article.article_id,
        exact: true,
      })
      .click();
    await page.getByLabel("Article Title").waitFor();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL("**/portal/admin/article");
    await page
      .getByRole("button", {
        name: "Delete article " + article.article_id,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert.equal((await call("/articles")).data.total, 1);
    await page
      .getByRole("button", {
        name: "Delete article " + article.article_id,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete article", exact: true })
      .click();
    await page.getByRole("heading", { name: "No articles yet" }).waitFor();
    assert.equal((await fetch(base + record.article_file)).status, 404);
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(
    await query(
      readOnly
        ? "SELECT * FROM article ORDER BY article_id"
        : "SELECT * FROM article WHERE journal_id<>? ORDER BY article_id",
      readOnly ? [] : [journalId],
    ),
    original,
  );
  console.log(
    readOnly
      ? "PASS: article list/pagination, direct edit/reload/cancel, issue and author selectors, add form, mobile layout, API authentication; existing articles unchanged."
      : "PASS: article CRUD, auth/CSRF, authors/order, corresponding author, issue validation, journal scope, duplicate keys, draft/published visibility, PDF uploads/access control, audit fields, search, separate pages, save/cancel, deletion confirmation, mobile layout; original articles unchanged.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  if (journalId) {
    const rows = await query(
      "SELECT COALESCE(article_pdf_storage,article_file) article_file FROM article WHERE journal_id=?",
      [journalId],
    );
    for (const row of rows)
      if (
        /^\/api\/articles\/files\/[a-f0-9-]{36}\.pdf$/.test(
          row.article_file || "",
        )
      )
        uploadedFiles.push(path.basename(row.article_file));
    await root(
      `DELETE FROM ijcsitr.article WHERE journal_id=${Number(journalId)} AND created_userid=${Number(userId)}; DELETE FROM ijcsitr.journal_issue WHERE journals_id=${Number(journalId)}; DELETE FROM ijcsitr.journal WHERE journal_id=${Number(journalId)} AND created_userid=${Number(userId)};`,
    );
  }
  const directory = path.resolve("uploads/articles");
  for (const filename of new Set(uploadedFiles)) {
    const target = path.resolve(directory, filename);
    assert.equal(path.dirname(target), directory);
    if (existsSync(target)) unlinkSync(target);
  }
  if (userId)
    await root(
      `DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  await db.end();
  console.log("Temporary article test records and account removed.");
}
