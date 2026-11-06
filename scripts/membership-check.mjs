import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { query, db } from "../server/db.ts";
import { hashPassword } from "../server/admin-security.ts";
import { removeUnusedMembershipPhoto } from "../server/membership-upload.ts";
const readOnly = process.argv.includes("--read-only"),
  base = "http://127.0.0.1:4009",
  marker = "Membership check " + randomUUID(),
  username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex");
function root(sql) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
      ["--login-path=ijcsitr-migration", "--batch"],
      { windowsHide: true },
      (err) =>
        err
          ? reject(new Error("Membership fixture setup/cleanup failed"))
          : resolve(),
    );
    child.stdin.end(sql);
  });
}
const original = await query("SELECT * FROM membership ORDER BY membership_id");
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
        `INSERT INTO ijcsitr.membership(name,email,membership_type,membership_year,status,created_userid,created_date) VALUES ('${marker} ${i}','test${i}@example.org','Regular',2026,${i % 2},${Number(userId)},NOW(6));`,
    ).join("\n"),
  );
  child = spawn(process.execPath, ["server/index.js"], {
    env: { ...process.env, PORT: "4009", ADMIN_USER_ID: String(userId) },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Membership server startup timed out")),
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
  await call("/memberships", { authenticated: false, status: 401 });
  const login = await call("/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  csrf = login.data.csrfToken;
  const valid = {
    name: marker + " API",
    email: "member@example.org",
    membership_type: "Regular",
    membership_year: 2026,
    status: 1,
  };
  await call("/memberships", {
    method: "POST",
    body: valid,
    headers: { "X-CSRF-Token": "invalid" },
    status: 403,
  });
  await call("/memberships", {
    method: "POST",
    body: { ...valid, email: "invalid" },
    status: 400,
  });
  await call("/memberships", {
    method: "POST",
    body: { ...valid, github: "javascript:bad()" },
    status: 400,
  });
  const invalidPhoto = new FormData();
  invalidPhoto.append("data", JSON.stringify(valid));
  invalidPhoto.append(
    "profile_photo_file",
    new Blob(["fake image"], { type: "image/png" }),
    "fake.png",
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/memberships", {
        method: "POST",
        headers: {
          Cookie: cookie,
          "X-CSRF-Token": csrf,
          "X-Admin-Request": "1",
        },
        body: invalidPhoto,
      })
    ).status,
    400,
  );
  const list = (await call("/memberships?q=" + encodeURIComponent(marker)))
    .data;
  assert.equal(list.total, 12);
  assert.equal(list.members.length, 10);
  assert.equal(
    (await call("/memberships?q=" + encodeURIComponent(marker) + "&page=2"))
      .data.members.length,
    2,
  );
  assert.equal(
    (await call("/memberships?q=" + encodeURIComponent(marker) + "&status=1"))
      .data.total,
    6,
  );
  if (!readOnly) {
    const id = (
      await call("/memberships", {
        method: "POST",
        body: { ...valid, created_userid: 999 },
        status: 201,
      })
    ).data.id;
    assert.equal(
      (await call("/memberships/" + id)).data.member.created_userid,
      userId,
    );
    await call("/memberships/" + id, {
      method: "PUT",
      body: { ...valid, status: 0 },
    });
    assert.equal((await call("/memberships/" + id)).data.member.status, 0);
    await call("/memberships/" + id, { method: "DELETE" });
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(base + "/portal/admin/membership");
  await page.waitForURL("**/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Membership", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Membership", exact: true })
    .waitFor();
  await page.getByLabel("Search memberships").fill(marker);
  await page.getByText("of 12 memberships", { exact: false }).waitFor();
  mkdirSync(".local/screenshots", { recursive: true });
  await page.screenshot({
    path: ".local/screenshots/admin-membership-list.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Next page", exact: true }).click();
  await page.getByText("Page 2 of 2", { exact: true }).waitFor();
  const sample = list.members[0];
  await page.goto(
    base + "/portal/admin/membership/edit?id=" + sample.membership_id,
  );
  await page.reload();
  await page.getByLabel("Name *", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Name *", { exact: true }).inputValue(),
    sample.name,
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await page.waitForURL("**/portal/admin/membership");
  await page.getByRole("link", { name: "Add new", exact: true }).click();
  await page.getByLabel("Membership Type *", { exact: true }).fill("Regular");
  await page
    .getByLabel("Membership Year *", { exact: true })
    .selectOption("2026");
  await page.getByLabel("Name *", { exact: true }).fill(marker + " Browser");
  await page.getByLabel("Email *", { exact: true }).fill("browser@example.org");
  await page
    .getByLabel("Affiliation", { exact: true })
    .fill("Example University");
  await page.getByLabel("Photo", { exact: true }).setInputFiles({
    name: "photo.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 32, height: 32, channels: 4, background: "#087f8c" },
    })
      .png()
      .toBuffer(),
  });
  await page.getByAltText("Membership photo preview").waitFor();
  await page.screenshot({
    path: ".local/screenshots/admin-membership-add.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: ".local/screenshots/admin-membership-mobile.png",
    fullPage: true,
  });
  if (readOnly) {
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL("**/portal/admin/membership");
  } else {
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.waitForURL("**/portal/admin/membership");
    await page.getByText(marker + " Browser", { exact: true }).waitFor();
    const member = (
      await call("/memberships?q=" + encodeURIComponent(marker + " Browser"))
    ).data.members[0];
    assert.match(
      member.photo,
      /^\/api\/admin\/memberships\/photos\/[a-f0-9-]{36}\.webp$/,
    );
    assert.equal((await fetch(base + member.photo)).status, 401);
    assert.equal(
      (await fetch(base + member.photo, { headers: { Cookie: cookie } }))
        .status,
      200,
    );
    await page
      .getByRole("link", {
        name: "Edit membership " + member.membership_id,
        exact: true,
      })
      .click();
    await page.reload();
    await page.getByLabel("Name *", { exact: true }).fill(marker + " Updated");
    await page.getByLabel("Status", { exact: true }).selectOption("0");
    await page.getByRole("button", { name: "Update", exact: true }).click();
    await page.waitForURL("**/portal/admin/membership");
    await page.getByText(marker + " Updated", { exact: true }).waitFor();
    assert.equal(
      (await call("/memberships/" + member.membership_id)).data.member.photo,
      member.photo,
    );
    await page
      .getByRole("button", {
        name: "Delete membership " + member.membership_id,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await call("/memberships/" + member.membership_id);
    await page
      .getByRole("button", {
        name: "Delete membership " + member.membership_id,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete membership", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "detached" });
    await call("/memberships/" + member.membership_id, { status: 404 });
    assert.equal(
      (await fetch(base + member.photo, { headers: { Cookie: cookie } }))
        .status,
      404,
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(
    await query(
      "SELECT * FROM membership WHERE created_userid IS NULL OR created_userid<>? ORDER BY membership_id",
      [userId],
    ),
    original,
  );
  console.log(
    "PASS: membership " +
      (readOnly
        ? "read-only list/search/pagination, edit/reload/cancel and add form"
        : "CRUD, audit fields, photo upload and cleanup, confirmed deletion") +
      ", validation, auth/CSRF, responsive pages; existing memberships unchanged.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  const photos = userId
    ? await query("SELECT photo FROM membership WHERE created_userid=?", [
        userId,
      ])
    : [];
  if (userId)
    await root(
      `DELETE FROM ijcsitr.membership WHERE created_userid=${Number(userId)} AND name LIKE '${marker}%'; DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  for (const row of photos) await removeUnusedMembershipPhoto(row.photo);
  await db.end();
  console.log("Temporary membership test records and account removed.");
}
