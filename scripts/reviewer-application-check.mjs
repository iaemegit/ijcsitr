import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import { query, db } from "../server/db.ts";
import { hashPassword } from "../server/admin-security.ts";
import {
  reviewerCvDirectory,
  reviewerCvPrefix,
  reviewerCvPattern,
} from "../server/reviewer-application.ts";
const root = (sql) =>
  execFileSync(
    "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
    ["--login-path=ijcsitr-migration", "--batch"],
    { input: sql, windowsHide: true },
  );
const marker = "reviewer_" + randomBytes(8).toString("hex"),
  email = marker + "@example.org",
  password = randomBytes(24).toString("hex"),
  base = "http://127.0.0.1:4017";
const original = await query("SELECT * FROM joinus ORDER BY js_id");
let userId, browser, child;
try {
  root(
    `INSERT INTO ijcsitr.users(user_name,user_password,user_created_at) VALUES ('${marker}','${await hashPassword(password)}',NOW(6));`,
  );
  userId = (
    await query("SELECT user_id FROM users WHERE user_name=?", [marker])
  )[0].user_id;
  child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: "4017", ADMIN_USER_ID: String(userId) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Reviewer test server did not start")),
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
  await page.goto(base + "/joinreviewer");
  await page
    .getByRole("button", { name: "Submit application", exact: true })
    .click();
  assert.equal(
    await page
      .locator("#join-prefix")
      .evaluate((input) => input.validity.valid),
    false,
  );
  const options = await (
    await page.request.get(base + "/api/join/options")
  ).json();
  assert.ok(options.disciplines.length);
  const data = {
    prefix: "Dr",
    name: marker,
    email_id: email,
    mobile_number: "1234567890",
    affiliation: "Temporary test institution",
    qualification: "PhD",
    discipline: options.disciplines[0].discipline_name,
    researcharea: "Computer science",
    country: "India",
    state: "Test State",
    city: "Test City",
    message: "Temporary reviewer application test.",
  };
  let response = await page.request.post(base + "/api/join", {
    multipart: data,
  });
  assert.equal(response.status(), 400);
  response = await page.request.post(base + "/api/join", {
    multipart: {
      ...data,
      resume: {
        name: "fake.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("not a PDF"),
      },
    },
  });
  assert.equal(response.status(), 400);
  response = await page.request.post(base + "/api/join", {
    multipart: {
      ...data,
      discipline: "Unavailable discipline",
      resume: {
        name: "resume.pdf",
        mimeType: "application/pdf",
        buffer: Buffer.from("%PDF-1.4\nTest\n%%EOF"),
      },
    },
  });
  assert.equal(response.status(), 400);
  for (const [name, value] of Object.entries(data)) {
    const field = page.locator(`[name="${name}"]`);
    if (["prefix", "discipline", "country"].includes(name))
      await field.selectOption(value);
    else await field.fill(value);
  }
  const pdf = Buffer.from("%PDF-1.4\nReviewer test CV\n%%EOF");
  await page
    .getByLabel("Resume / CV *", { exact: true })
    .setInputFiles({
      name: "resume.pdf",
      mimeType: "application/pdf",
      buffer: pdf,
    });
  await page
    .getByRole("button", { name: "Submit application", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Application received", exact: true })
    .waitFor();
  const row = (
    await query("SELECT * FROM joinus WHERE email_id=?", [email])
  )[0];
  assert.equal(row.status, 0);
  assert.equal(row.qualifiaction, "PhD");
  assert.equal(row.created_userid, null);
  assert.ok(row.resume_cv.startsWith(reviewerCvPrefix));
  assert.equal((await fetch(base + row.resume_cv)).status, 404);
  assert.equal(
    (await fetch(base + `/api/admin/resources/join-us/${row.js_id}/attachment`))
      .status,
    401,
  );
  await page.goto(base + "/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(marker);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page.goto(base + "/portal/admin/join-us");
  await page.getByLabel("Search Join Us", { exact: true }).fill(marker);
  await page.getByText(marker, { exact: true }).waitFor();
  const attachment = await page.request.get(
    base + `/api/admin/resources/join-us/${row.js_id}/attachment`,
  );
  assert.equal(attachment.status(), 200);
  assert.deepEqual(await attachment.body(), pdf);
  const doc = Buffer.concat([
    Buffer.from("d0cf11e0a1b11ae1", "hex"),
    Buffer.alloc(512),
  ]);
  response = await page.request.post(base + "/api/join", {
    multipart: {
      ...data,
      resume: {
        name: "resume.doc",
        mimeType: "application/msword",
        buffer: doc,
      },
    },
  });
  assert.equal(response.status(), 201);
  const wordId = (await response.json()).id;
  const wordAttachment = await page.request.get(
    base + `/api/admin/resources/join-us/${wordId}/attachment`,
  );
  assert.equal(wordAttachment.status(), 200);
  assert.equal(wordAttachment.headers()["content-type"], "application/msword");
  assert.deepEqual(await wordAttachment.body(), doc);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(base + "/joinreviewer");
  await page
    .getByRole("button", { name: "Submit application", exact: true })
    .waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  assert.deepEqual(
    await query(
      "SELECT * FROM joinus WHERE email_id<>? OR email_id IS NULL ORDER BY js_id",
      [email],
    ),
    original,
  );
  console.log(
    "PASS: Join registration, validation, pending inbox record, PDF/Word CVs, authenticated downloads, privacy and mobile layout; original applications unchanged.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  const rows = await query(
    "SELECT js_id,resume_cv FROM joinus WHERE email_id=? AND name=?",
    [email, marker],
  );
  for (const row of rows) {
    root(
      `DELETE FROM ijcsitr.joinus WHERE js_id=${Number(row.js_id)} AND email_id='${email}';`,
    );
    const filename = row.resume_cv?.startsWith(reviewerCvPrefix)
      ? row.resume_cv.slice(reviewerCvPrefix.length)
      : "";
    if (reviewerCvPattern.test(filename)) {
      const target = path.resolve(reviewerCvDirectory, filename);
      assert.equal(path.dirname(target), reviewerCvDirectory);
      await unlink(target).catch((error) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }
  if (userId)
    root(
      `DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${marker}';`,
    );
  await db.end();
}
