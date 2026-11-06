import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomUUID, randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import { query, db } from "../server/db.ts";
import { hashPassword } from "../server/admin-security.ts";
import { unlinkContentFile } from "../server/admin-content-upload.ts";
import { joinUsConfig } from "../src/pages/admin/join-us/join-us-config.ts";
import { onlinePapersConfig } from "../src/pages/admin/online-papers/online-papers-config.ts";
import { downloadsConfig } from "../src/pages/admin/downloads/downloads-config.ts";
import { testimonialConfig } from "../src/pages/admin/testimonial/testimonial-config.ts";
import { contactUsConfig } from "../src/pages/admin/contact-us/contact-us-config.ts";
const sections = [
  { config: joinUsConfig, table: "joinus" },
  { config: onlinePapersConfig, table: "article_submission" },
  { config: downloadsConfig, table: "downloads" },
  { config: testimonialConfig, table: "testimonial" },
  { config: contactUsConfig, table: "contactus" },
];
const readOnly = process.argv.includes("--read-only"),
  base = "http://127.0.0.1:4012",
  marker = "Content check " + randomUUID(),
  username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex"),
  legacyFilename = randomUUID() + ".pdf",
  legacyPath = path.resolve("uploads", legacyFilename),
  snapshots = {};
let userId,
  child,
  browser,
  cookie = "",
  csrf = "";
const ids = {};
function root(sql) {
  return new Promise((resolve, reject) => {
    const process = execFile(
      "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
      ["--login-path=ijcsitr-migration", "--batch"],
      { windowsHide: true },
      (err) =>
        err
          ? reject(new Error("Admin content fixture setup/cleanup failed"))
          : resolve(),
    );
    process.stdin.end(sql);
  });
}
function quote(value) {
  return "'" + String(value).replaceAll("'", "''") + "'";
}
function payload(config) {
  return {
    ...Object.fromEntries(
      config.fields.map((field) => [
        field.key,
        field.type === "email"
          ? "member@example.org"
          : field.required
            ? marker
            : "",
      ]),
    ),
    ...(config.status ? { status: 1 } : {}),
    ...(config.fileField
      ? {
          [config.fileField]:
            config.key === "downloads"
              ? "https://example.org/document.pdf"
              : "",
        }
      : {}),
  };
}
try {
  for (const { config, table } of sections)
    snapshots[table] = await query(
      `SELECT * FROM ${table} ORDER BY ${config.id}`,
    );
  await root(
    `INSERT INTO ijcsitr.users(user_name,user_password,user_created_at) VALUES ('${username}','${await hashPassword(password)}',NOW(6));`,
  );
  userId = (
    await query("SELECT user_id FROM users WHERE user_name=?", [username])
  )[0].user_id;
  mkdirSync("uploads", { recursive: true });
  writeFileSync(legacyPath, "%PDF-1.4\nPrivate fixture\n%%EOF");
  for (const { config, table } of sections) {
    const data = payload(config);
    if (config.key === "online-papers") data.upload_manuscript = legacyFilename;
    const rows = config.key === "downloads" ? 12 : 1;
    for (let index = 0; index < rows; index++) {
      const values = {
        ...data,
        created_date: "2026-10-22 00:00:00",
        ...(table !== "contactus" ? { created_userid: userId } : {}),
      };
      await root(
        `INSERT INTO ijcsitr.${table} (${Object.keys(values).join(",")}) VALUES (${Object.values(values).map(quote).join(",")});`,
      );
    }
    ids[config.key] = (
      await query(
        `SELECT ${config.id} id FROM ${table} ORDER BY ${config.id} DESC LIMIT 1`,
      )
    )[0].id;
  }
  child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: "4012", ADMIN_USER_ID: String(userId) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Content test startup timed out")),
      20000,
    );
    child.stdout.on("data", (chunk) => {
      if (chunk.toString().includes("IJCSITR API:")) {
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
  const login = await call("/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  csrf = login.data.csrfToken;
  for (const { config } of sections) {
    const route = "/resources/" + config.key,
      id = ids[config.key];
    await call(route, { authenticated: false, status: 401 });
    await call(route + "/" + id);
    const list = (await call(route + "?q=" + encodeURIComponent(marker))).data;
    assert.equal(list.total, config.key === "downloads" ? 12 : 1);
    await call(route + "/" + id, {
      method: "PUT",
      body: payload(config),
      headers: { "X-CSRF-Token": "invalid" },
      status: 403,
    });
    const required = config.fields.find((field) => field.required);
    await call(route + "/" + id, {
      method: "PUT",
      body: { ...payload(config), [required.key]: "" },
      status: 400,
    });
    if (!config.create)
      await call(route, { method: "POST", body: payload(config), status: 405 });
    if (!readOnly) {
      await call(route + "/" + id, { method: "PUT", body: payload(config) });
      if (config.create) {
        const created = (
          await call(route, {
            method: "POST",
            body: payload(config),
            status: 201,
          })
        ).data.id;
        await call(route + "/" + created, { method: "DELETE" });
      }
    }
  }
  const privateRoute =
    "/api/admin/resources/online-papers/" +
    ids["online-papers"] +
    "/attachment";
  assert.equal((await fetch(base + privateRoute)).status, 401);
  const pdf = await fetch(base + privateRoute, { headers: { Cookie: cookie } });
  assert.equal(pdf.status, 200);
  assert.equal(
    Buffer.from(await pdf.arrayBuffer())
      .subarray(0, 5)
      .toString(),
    "%PDF-",
  );
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(base + "/portal/admin/dashboard");
  await page.waitForURL("**/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  mkdirSync(".local/screenshots", { recursive: true });
  for (const { config } of sections) {
    const navigation = page.getByRole("navigation", {
      name: "Admin navigation",
    });
    if (
      await page
        .getByRole("button", { name: "Open admin menu", exact: true })
        .isVisible()
    )
      await page
        .getByRole("button", { name: "Open admin menu", exact: true })
        .click();
    await navigation
      .getByRole("link", { name: config.title, exact: true })
      .click();
    await page
      .getByRole("heading", { name: config.title, exact: true })
      .waitFor();
    await page
      .getByLabel("Search " + config.title, { exact: true })
      .fill(marker);
    await page.locator(".content-admin-table tbody tr").first().waitFor();
    if (config.key === "downloads") {
      await page
        .getByRole("button", { name: "Next page", exact: true })
        .click();
      await page.getByText("Page 2 of 2", { exact: true }).waitFor();
    }
    await page.goto(
      base + "/portal/admin/" + config.key + "/edit?id=" + ids[config.key],
    );
    await page.reload();
    await page
      .getByRole("heading", {
        name: "Review / Edit " + config.title,
        exact: true,
      })
      .waitFor();
    const required = config.fields.find((field) => field.required);
    await page.getByLabel(required.label + " *", { exact: true }).waitFor();
    assert.equal(
      await page
        .getByLabel(required.label + " *", { exact: true })
        .inputValue(),
      marker,
    );
    await page.screenshot({
      path: ".local/screenshots/admin-" + config.key + "-edit.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL("**/portal/admin/" + config.key);
    if (config.create) {
      await page.getByRole("link", { name: "Add new", exact: true }).click();
      await page
        .getByLabel(required.label + " *", { exact: true })
        .fill(marker);
      await page.getByRole("button", { name: "Cancel", exact: true }).click();
      await page.waitForURL("**/portal/admin/" + config.key);
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  assert.deepEqual(errors, []);
  console.log(
    "PASS: five admin sections, search/pagination, authentication/CSRF, inbox creation protection, direct edit/reload/cancel, separate add pages, private legacy manuscript access and mobile layout.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  const files = [];
  if (userId) {
    for (const { config, table } of sections) {
      const where =
        table === "contactus"
          ? `name=${quote(marker)}`
          : `created_userid=${Number(userId)}`;
      if (config.fileField)
        files.push(
          ...(
            await query(
              `SELECT ${config.fileField} file FROM ${table} WHERE ${where}`,
            )
          ).map((row) => row.file),
        );
      await root(`DELETE FROM ijcsitr.${table} WHERE ${where};`);
    }
    await root(
      `DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  }
  for (const file of files) await unlinkContentFile(file);
  if (existsSync(legacyPath)) unlinkSync(legacyPath);
  for (const { config, table } of sections)
    if (snapshots[table])
      assert.deepEqual(
        await query(`SELECT * FROM ${table} ORDER BY ${config.id}`),
        snapshots[table],
      );
  await db.end();
  console.log(
    "Temporary records and account removed; original data preserved.",
  );
}
