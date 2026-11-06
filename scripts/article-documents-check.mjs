import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { query, db } from "../server/db.ts";
import { currentJournal } from "../server/journal.ts";
import { hashPassword } from "../server/admin-security.ts";
import {
  wordFilePath,
  articleWordDirectory,
} from "../server/article-documents.ts";
import { readFile } from "node:fs/promises";
import {
  articlePdfPattern,
  removeArticleFiles,
} from "../server/article-upload.ts";
const root = (sql) =>
  execFileSync(
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
    ["--login-path=ijcsitr-migration", "--batch"],
    { input: sql, windowsHide: true },
  );
const suffix = randomBytes(8).toString("hex"),
  username = "docs_" + suffix,
  password = randomBytes(24).toString("hex"),
  key = "IJCSITR_TEST_" + suffix;
const base = "http://127.0.0.1:4016";
const original = await query("SELECT * FROM article ORDER BY article_id");
let userId,
  articleId,
  child,
  browser,
  files = [];
try {
  root(
    `INSERT INTO ijcsitr.users(user_name,user_password,user_created_at) VALUES ('${username}','${await hashPassword(password)}',NOW(6));`,
  );
  userId = (
    await query("SELECT user_id FROM users WHERE user_name=?", [username])
  )[0].user_id;
  const journal = await currentJournal();
  const source = original.find((a) => a.journal_id === journal.journal_id);
  assert.ok(source);
  const columns = (await query("DESCRIBE article"))
    .map((c) => c.Field)
    .filter((c) => c !== "article_id");
  const replacements = {
    article_key: `'${key}'`,
    article_title: `'Document test ${suffix}'`,
    article_file: "NULL",
    article_pdf_storage: "NULL",
    article_word_file: "NULL",
    status: "0",
    created_userid: String(userId),
  };
  root(
    `INSERT INTO ijcsitr.article(${columns.map((c) => "`" + c + "`").join(",")}) SELECT ${columns.map((c) => replacements[c] || "`" + c + "`").join(",")} FROM ijcsitr.article WHERE article_id=${Number(source.article_id)};`,
  );
  articleId = (
    await query("SELECT article_id FROM article WHERE article_key=?", [key])
  )[0].article_id;
  child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: "4016", ADMIN_USER_ID: String(userId) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Test server startup timed out")),
      30000,
    );
    child.stdout.on("data", (b) => {
      if (b.toString().includes("IJCSITR API:")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.on("error", reject);
  });
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.goto(base + "/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page.goto(base + "/portal/admin/article/edit?id=" + articleId);
  await page.getByLabel("Article Title").waitFor();
  assert.equal(await page.getByLabel("Copyright", { exact: true }).count(), 0);
  // Valid input lets the missing-PDF warning be checked independently of legacy metadata.
  await page
    .getByRole("textbox", { name: "Abstract Text", exact: true })
    .fill("A temporary abstract for testing article document uploads.");
  await page.getByLabel("Publication Date").fill("2026-10-22");
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Upload the PDF before saving" })
    .waitFor();
  const pdfBytes = Buffer.from("%PDF-1.4\nDocument upload check\n%%EOF");
  await page.getByLabel("Article File (PDF)").setInputFiles({
    name: "paper.pdf",
    mimeType: "application/pdf",
    buffer: pdfBytes,
  });
  assert.equal(
    await page.getByRole("link", { name: "Open PDF", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "Upload PDF", exact: true }).click();
  await page
    .getByText("PDF uploaded. Save the article to attach it.", { exact: true })
    .waitFor();
  assert.equal(await page.getByLabel("Article File (PDF)").isDisabled(), true);
  const pdfLink = await page
    .getByRole("link", { name: "Open PDF", exact: true })
    .getAttribute("href");
  const pendingPdf = await page.request.get(base + pdfLink);
  assert.equal(pendingPdf.status(), 200);
  assert.deepEqual(await pendingPdf.body(), pdfBytes);
  assert.equal((await fetch(base + pdfLink)).status, 401);
  const wordBytes = Buffer.concat([
    Buffer.from("d0cf11e0a1b11ae1", "hex"),
    Buffer.alloc(512),
  ]);
  await page.getByLabel("Article File (Word)").setInputFiles({
    name: "paper.doc",
    mimeType: "application/msword",
    buffer: wordBytes,
  });
  await page.getByRole("button", { name: "Upload Word", exact: true }).click();
  await page
    .getByText("Word uploaded. Save the article to attach it.", { exact: true })
    .waitFor();
  assert.equal(await page.getByLabel("Article File (Word)").isDisabled(), true);
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await page.waitForURL("**/portal/admin/article");
  let saved = (
    await query("SELECT * FROM article WHERE article_id=?", [articleId])
  )[0];
  files = [saved.article_pdf_storage, saved.article_word_file];
  assert.equal(saved.copyright, "2026");
  assert.ok(saved.article_word_file.startsWith("/articles/word_files/"));
  assert.equal(
    path.dirname(wordFilePath(saved.article_word_file)),
    articleWordDirectory,
  );
  assert.deepEqual(
    await readFile(wordFilePath(saved.article_word_file)),
    wordBytes,
  );
  assert.equal(path.basename(saved.article_pdf_storage), key + ".pdf");
  assert.equal(
    saved.article_file,
    `/index.php/home/article/view/${key}/${key}.pdf`,
  );
  assert.ok(saved.article_word_file.endsWith(".doc"));
  assert.equal((await fetch(base + saved.article_file)).status, 404);
  await page.goto(base + "/portal/admin/article/edit?id=" + articleId);
  await page.getByLabel("Current PDF path / link").waitFor();
  assert.equal(await page.getByLabel("Article File (PDF)").isDisabled(), true);
  assert.equal(await page.getByLabel("Article File (Word)").isDisabled(), true);
  assert.equal(
    (
      await page.request.get(base + `/api/admin/articles/${articleId}/word`)
    ).status(),
    200,
  );
  assert.equal(
    (await fetch(base + `/api/admin/articles/${articleId}/word`)).status,
    401,
  );
  await page.getByLabel("Status *", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await page.waitForURL("**/portal/admin/article");
  const published = await fetch(base + saved.article_file);
  assert.equal(published.status, 200);
  assert.deepEqual(Buffer.from(await published.arrayBuffer()), pdfBytes);
  assert.equal(
    (await fetch(base + saved.article_file.replace(key + ".pdf", "wrong.pdf")))
      .status,
    404,
  );
  await page.goto(base + "/portal/admin/article/edit?id=" + articleId);
  await page.getByRole("button", { name: "Delete Word", exact: true }).click();
  assert.equal(await page.getByLabel("Article File (Word)").isEnabled(), true);
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await page.waitForURL("**/portal/admin/article");
  assert.equal(
    (
      await query("SELECT article_word_file FROM article WHERE article_id=?", [
        articleId,
      ])
    )[0].article_word_file,
    null,
  );
  await page.goto(base + "/portal/admin/article/edit?id=" + articleId);
  await page.getByRole("button", { name: "Delete PDF", exact: true }).click();
  assert.equal(await page.getByLabel("Article File (PDF)").isEnabled(), true);
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Upload the PDF before saving" })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(
    await query(
      "SELECT * FROM article WHERE article_id<>? ORDER BY article_id",
      [articleId],
    ),
    original,
  );
  console.log(
    "PASS: separate PDF/Word uploads, chooser locking, required PDF, save/reload, canonical link, draft privacy, published PDF, private Word, deletion and mobile layout; original articles unchanged.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  if (articleId) {
    const rows = await query(
      "SELECT article_pdf_storage,article_word_file FROM article WHERE article_id=?",
      [articleId],
    );
    if (rows[0])
      files.push(rows[0].article_pdf_storage, rows[0].article_word_file);
    root(
      `DELETE FROM ijcsitr.article WHERE article_id=${Number(articleId)} AND created_userid=${Number(userId)};`,
    );
  }
  for (const file of new Set(files.filter(Boolean))) {
    const directory = path.resolve("uploads/articles");
    const relative = articlePdfPattern.exec(file)?.[1] || path.basename(file);
    const target = wordFilePath(file) || path.resolve(directory, relative);
    assert.ok(target.startsWith(directory + path.sep));
    await removeArticleFiles([target]);
  }
  if (userId)
    root(
      `DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  await db.end();
}
