import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { query, db } from "../server/db.ts";
import { hashPassword } from "../server/admin-security.ts";
import { removeUnusedCallPdf } from "../server/call-for-paper-upload.ts";
const readOnly = process.argv.includes("--read-only"),
  base = "http://127.0.0.1:4011",
  username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex");
function root(sql) {
  return new Promise((resolve, reject) => {
    const process = execFile(
      "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
      ["--login-path=ijcsitr-migration", "--batch"],
      { windowsHide: true },
      (err) =>
        err
          ? reject(new Error("Call for papers fixture setup/cleanup failed"))
          : resolve(),
    );
    process.stdin.end(sql);
  });
}
const original = await query("SELECT * FROM callforpaper ORDER BY call_id");
let userId,
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
    Array.from(
      { length: 12 },
      (_, i) =>
        `INSERT INTO ijcsitr.callforpaper(issue_month,issue_year,deadline,dispatch_month,dispatch_year,dispatch_date,status,created_date,created_userid) VALUES ('January','2098','2098-06-30','July','2098','2098-07-01',${i % 2},NOW(6),${Number(userId)});`,
    ).join("\n"),
  );
  child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: "4011", ADMIN_USER_ID: String(userId) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Call test server startup timed out")),
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
      reject(new Error("Test server exited " + code));
    });
  });
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
  await call("/calls-for-papers", { authenticated: false, status: 401 });
  const login = await call("/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  csrf = login.data.csrfToken;
  const valid = {
    issue_month: "January",
    issue_year: "2098",
    deadline: "2098-06-30",
    dispatch_month: "July",
    dispatch_year: "2098",
    dispatch_date: "2098-07-01",
    status: 1,
  };
  await call("/calls-for-papers", {
    method: "POST",
    body: valid,
    headers: { "X-CSRF-Token": "invalid" },
    status: 403,
  });
  await call("/calls-for-papers", {
    method: "POST",
    body: { ...valid, deadline: "2098-02-30" },
    status: 400,
  });
  await call("/calls-for-papers", {
    method: "POST",
    body: { ...valid, dispatch_date: "2098-06-29" },
    status: 400,
  });
  const invalidPdf = new FormData();
  invalidPdf.append("data", JSON.stringify(valid));
  invalidPdf.append(
    "call_pdf",
    new Blob(["fake PDF"], { type: "application/pdf" }),
    "fake.pdf",
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/calls-for-papers", {
        method: "POST",
        headers: {
          Cookie: cookie,
          "X-CSRF-Token": csrf,
          "X-Admin-Request": "1",
        },
        body: invalidPdf,
      })
    ).status,
    400,
  );
  const list = (await call("/calls-for-papers?q=2098")).data;
  assert.equal(list.total, 12);
  assert.equal(list.calls.length, 10);
  assert.equal(
    (await call("/calls-for-papers?q=2098&page=2")).data.calls.length,
    2,
  );
  assert.equal((await call("/calls-for-papers?q=2098&status=1")).data.total, 6);
  if (!readOnly) {
    const id = (
      await call("/calls-for-papers", {
        method: "POST",
        body: { ...valid, created_userid: 999 },
        status: 201,
      })
    ).data.id;
    const record = (await call("/calls-for-papers/" + id)).data.call;
    assert.equal(record.created_userid, userId);
    assert.equal(record.deadline.slice(0, 10), "2098-06-30");
    await call("/calls-for-papers/" + id, {
      method: "PUT",
      body: { ...valid, status: 0 },
    });
    assert.equal((await call("/calls-for-papers/" + id)).data.call.status, 0);
    await call("/calls-for-papers/" + id, { method: "DELETE" });
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(base + "/portal/admin/call-for-paper");
  await page.waitForURL("**/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Call for Papers", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Call for Papers", exact: true })
    .waitFor();
  await page.getByLabel("Search calls for papers").fill("2098");
  await page.getByText("of 12 calls", { exact: false }).waitFor();
  await page.locator(".cfp-table tbody tr").first().waitFor();
  mkdirSync(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/admin-call-for-paper-list.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByText("Page 2 of 2", { exact: true }).waitFor();
  const sample = list.calls[0];
  await page.goto(
    base + "/portal/admin/call-for-paper/edit?id=" + sample.call_id,
  );
  await page.reload();
  await page.getByLabel("Deadline *", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Deadline *", { exact: true }).inputValue(),
    "2098-06-30",
  );
  assert.equal(
    await page.getByLabel("Issue Year *", { exact: true }).inputValue(),
    "2098",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.waitForURL("**/portal/admin/call-for-paper");
  await page
    .getByRole("button", { name: "Delete call " + sample.call_id, exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await page.getByRole("link", { name: "Add new", exact: true }).click();
  await page
    .getByLabel("Issue Month *", { exact: true })
    .selectOption("January");
  await page.getByLabel("Issue Year *", { exact: true }).selectOption("2026");
  await page.getByLabel("Deadline *", { exact: true }).fill("2026-06-30");
  await page
    .getByLabel("Dispatch Month *", { exact: true })
    .selectOption("July");
  await page
    .getByLabel("Dispatch Year *", { exact: true })
    .selectOption("2026");
  await page.getByLabel("Dispatch Date *", { exact: true }).fill("2026-07-01");
  await page
    .getByLabel("File (PDF)", { exact: true })
    .setInputFiles({
      name: "call.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("%PDF-1.4\nTemporary call\n%%EOF"),
    });
  await page.screenshot({
    path: ".local/screenshots/admin-call-for-paper-add.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: ".local/screenshots/admin-call-for-paper-mobile.png",
    fullPage: true,
  });
  if (readOnly) {
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL("**/portal/admin/call-for-paper");
  } else {
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.waitForURL("**/portal/admin/call-for-paper");
    await page.locator(".cfp-table tbody tr").first().waitFor();
    const record = (await call("/calls-for-papers")).data.calls[0];
    assert.match(
      record.file,
      /^\/api\/admin\/calls-for-papers\/files\/[a-f0-9-]{36}\.pdf$/,
    );
    assert.equal((await fetch(base + record.file)).status, 401);
    assert.equal(
      (await fetch(base + record.file, { headers: { Cookie: cookie } })).status,
      200,
    );
    await page
      .getByRole("link", { name: "Edit call " + record.call_id, exact: true })
      .click();
    await page.reload();
    await page.getByLabel("Status", { exact: true }).selectOption("0");
    await page.getByRole("button", { name: "Update", exact: true }).click();
    await page.waitForURL("**/portal/admin/call-for-paper");
    await page
      .getByRole("link", { name: "Edit call " + record.call_id, exact: true })
      .waitFor();
    const updated = (await call("/calls-for-papers/" + record.call_id)).data
      .call;
    assert.equal(updated.status, 0);
    assert.equal(updated.file, record.file);
    assert.equal(updated.updated_userid, userId);
    await page
      .getByRole("button", {
        name: "Delete call " + record.call_id,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete call", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await call("/calls-for-papers/" + record.call_id, { status: 404 });
    assert.equal(
      (await fetch(base + record.file, { headers: { Cookie: cookie } })).status,
      404,
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(
    await query(
      "SELECT * FROM callforpaper WHERE created_userid IS NULL OR created_userid<>? ORDER BY call_id",
      [userId],
    ),
    original,
  );
  console.log(
    "PASS: Call for Papers " +
      (readOnly
        ? "read-only list/search/pagination, direct edit/reload/cancel and add form"
        : "CRUD, date persistence, audit fields, PDF upload/access/cleanup and confirmed deletion") +
      ", validation, auth/CSRF and mobile layout; existing records unchanged.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  const files = userId
    ? await query("SELECT file FROM callforpaper WHERE created_userid=?", [
        userId,
      ])
    : [];
  if (userId)
    await root(
      `DELETE FROM ijcsitr.callforpaper WHERE created_userid=${Number(userId)}; DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  for (const row of files) await removeUnusedCallPdf(row.file);
  await db.end();
  console.log("Temporary call for papers test records and account removed.");
}
