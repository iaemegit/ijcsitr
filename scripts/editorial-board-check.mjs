import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";
import { query, db } from "../server/db.ts";
import { hashPassword } from "../server/admin-security.ts";
import sharp from "sharp";
import { removeUnusedBoardPhoto } from "../server/editorial-board-upload.ts";
const readOnly = process.argv.includes("--read-only"),
  base = "http://127.0.0.1:4008",
  marker = "Board check " + randomUUID(),
  username = "test_" + randomBytes(8).toString("hex"),
  password = randomBytes(24).toString("hex");
function root(sql) {
  return new Promise((resolve, reject) => {
    const child = execFile(
      "C:\\Program Files\\MySQL\\MySQL Server 8.4\\bin\\mysql.exe",
      ["--login-path=ijcsitr-migration", "--batch"],
      { windowsHide: true },
      (error) =>
        error
          ? reject(new Error("Board fixture setup/cleanup failed"))
          : resolve(),
    );
    child.stdin.end(sql);
  });
}
const original = await query(
  "SELECT * FROM editorial_board ORDER BY member_id",
);
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
  if (!readOnly) {
    await root(
      `INSERT INTO ijcsitr.journal(journal_name,journal_key,publication_frequency,start_month,start_year,created_userid,created_date) VALUES ('${marker}','${randomUUID()}','Monthly','January','2026',${Number(userId)},NOW(6));`,
    );
    journalId = (
      await query(
        "SELECT journal_id FROM journal WHERE journal_key IS NOT NULL AND created_userid=?",
        [userId],
      )
    )[0].journal_id;
  }
  child = spawn(process.execPath, ["server/index.js"], {
    env: {
      ...process.env,
      PORT: "4008",
      ADMIN_USER_ID: String(userId),
      ...(journalId ? { JOURNAL_ID: String(journalId) } : {}),
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Board test startup timed out")),
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
  await call("/editorial-board", { authenticated: false, status: 401 });
  const login = await call("/login", {
    method: "POST",
    body: { username, password },
  });
  cookie = login.response.headers.get("set-cookie").split(";")[0];
  csrf = login.data.csrfToken;
  await call("/editorial-board", {
    method: "POST",
    body: {},
    headers: { "X-CSRF-Token": "invalid" },
    status: 403,
  });
  const list = (await call("/editorial-board")).data;
  const invalidPhoto = new FormData();
  invalidPhoto.append(
    "data",
    JSON.stringify({
      editor_name: marker,
      editor_affiliation: "Example University",
      editor_type: "Editorial Board Member",
      status: 1,
    }),
  );
  invalidPhoto.append(
    "profile_photo_file",
    new Blob(["invalid image"], { type: "image/png" }),
    "fake.png",
  );
  assert.equal(
    (
      await fetch(base + "/api/admin/editorial-board", {
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
  const sample = readOnly ? list.members[0] : null;
  if (readOnly) {
    assert.ok(list.total >= 202);
    assert.equal(list.members.length, 10);
    await call("/editorial-board/" + sample.member_id);
    const searched = (
      await call("/editorial-board?q=" + encodeURIComponent(sample.editor_name))
    ).data;
    assert.ok(
      searched.members.some((member) => member.member_id === sample.member_id),
    );
  }
  await call("/editorial-board/not-an-id", { status: 400 });
  if (!readOnly) {
    const data = {
      editor_name: marker + " API",
      editor_affiliation: "Example University, India",
      editor_type: "Associate Editor",
      status: 0,
      editor_email: "test@example.org",
    };
    await call("/editorial-board", {
      method: "POST",
      body: { ...data, editor_email: "invalid" },
      status: 400,
    });
    await call("/editorial-board", {
      method: "POST",
      body: { ...data, orcid_link: "javascript:alert(1)" },
      status: 400,
    });
    const id = (
      await call("/editorial-board", {
        method: "POST",
        body: { ...data, journal_id: 999, created_userid: 999 },
        status: 201,
      })
    ).data.id;
    const member = (await call("/editorial-board/" + id)).data.member;
    assert.equal(member.journal_id, journalId);
    assert.equal(member.created_userid, userId);
    assert.equal(
      (await (await fetch(base + "/api/editors")).json()).editors.length,
      0,
    );
    await call("/editorial-board/" + id, {
      method: "PUT",
      body: {
        ...data,
        status: 1,
        institutional_profile: "https://example.org/profile",
      },
    });
    const publicMembers = (await (await fetch(base + "/api/editors")).json())
      .editors;
    assert.equal(publicMembers.length, 1);
    assert.equal(publicMembers[0].name, data.editor_name);
    assert.equal(publicMembers[0].editor_email, undefined);
    if (original.length) {
      await call("/editorial-board/" + original[0].member_id, { status: 404 });
      await call("/editorial-board/" + original[0].member_id, {
        method: "PUT",
        body: data,
        status: 404,
      });
      await call("/editorial-board/" + original[0].member_id, {
        method: "DELETE",
        status: 404,
      });
    }
    await call("/editorial-board/" + id, { method: "DELETE" });
  }
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    }),
    errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  await page.goto(base + "/portal/admin/editorial-board");
  await page.waitForURL("**/portal/admin/login");
  await page.getByLabel("Username", { exact: true }).fill(username);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("**/portal/admin/dashboard");
  await page
    .getByRole("navigation", { name: "Admin navigation" })
    .getByRole("link", { name: "Editorial Board", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Editorial Board", exact: true })
    .waitFor();
  mkdirSync(".local/screenshots", { recursive: true });
  if (readOnly) {
    await page.locator(".board-table tbody tr").first().waitFor();
    await page.screenshot({
      path: ".local/screenshots/admin-editorial-board-list.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await page.getByText("Page 2 of", { exact: false }).waitFor();
    await page.getByLabel("Search board members").fill(sample.editor_name);
    await page
      .getByRole("link", {
        name: "Edit member " + sample.member_id,
        exact: true,
      })
      .waitFor();
    await page
      .getByRole("button", {
        name: "Delete member " + sample.member_id,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    await page
      .getByRole("link", {
        name: "Edit member " + sample.member_id,
        exact: true,
      })
      .click();
    await page.reload();
    await page.getByLabel("Editor Name *", { exact: true }).waitFor();
    assert.equal(
      await page.getByLabel("Editor Name *", { exact: true }).inputValue(),
      sample.editor_name,
    );
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL("**/portal/admin/editorial-board");
  }
  await page.getByRole("link", { name: "Add new", exact: true }).click();
  await page
    .getByLabel("Editor Name *", { exact: true })
    .fill(marker + " Browser");
  await page
    .getByLabel("Editor Affiliation *", { exact: true })
    .fill("Example University, India");
  await page
    .getByLabel("Editor Type *", { exact: true })
    .selectOption("Editorial Board Member");
  await page
    .getByLabel("Editor Email", { exact: true })
    .fill("board@example.org");
  const options = (await call("/editorial-board/options")).data;
  await page
    .getByLabel("Journal *", { exact: true })
    .selectOption(String(options.journal.journal_id));
  assert.equal(
    await page.getByLabel("Profile Photo URL", { exact: true }).count(),
    0,
  );
  assert.equal(await page.getByLabel("Member Key", { exact: true }).count(), 0);
  await page.getByLabel("Profile Photo", { exact: true }).setInputFiles({
    name: "profile.png",
    mimeType: "image/png",
    buffer: await sharp({
      create: { width: 32, height: 32, channels: 4, background: "#087f8c" },
    })
      .png()
      .toBuffer(),
  });
  await page.getByAltText("Editorial board member preview").waitFor();
  await page.screenshot({
    path: ".local/screenshots/admin-editorial-board-add.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: ".local/screenshots/admin-editorial-board-mobile.png",
    fullPage: true,
  });
  if (readOnly) {
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.waitForURL("**/portal/admin/editorial-board");
  } else {
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.waitForURL("**/portal/admin/editorial-board");
    await page.getByText(marker + " Browser", { exact: true }).waitFor();
    const member = (await call("/editorial-board")).data.members[0];
    assert.match(
      member.profile_photo,
      /^\/api\/admin\/editorial-board\/photos\/[a-f0-9-]{36}\.webp$/,
    );
    assert.equal((await fetch(base + member.profile_photo)).status, 401);
    assert.equal(
      (
        await fetch(base + member.profile_photo, {
          headers: { Cookie: cookie },
        })
      ).status,
      200,
    );
    await page
      .getByRole("link", {
        name: "Edit member " + member.member_id,
        exact: true,
      })
      .click();
    await page.reload();
    await page
      .getByLabel("Editor Name *", { exact: true })
      .fill(marker + " Updated");
    await page.getByRole("button", { name: "Update", exact: true }).click();
    await page.waitForURL("**/portal/admin/editorial-board");
    await page.getByText(marker + " Updated", { exact: true }).waitFor();
    assert.equal(
      (await call("/editorial-board/" + member.member_id)).data.member
        .profile_photo,
      member.profile_photo,
    );
    await page
      .getByRole("button", {
        name: "Delete member " + member.member_id,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancel", exact: true })
      .click();
    assert.equal((await call("/editorial-board")).data.total, 1);
    await page
      .getByRole("button", {
        name: "Delete member " + member.member_id,
        exact: true,
      })
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete member", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "No board members yet", exact: true })
      .waitFor();
    assert.equal(
      (
        await fetch(base + member.profile_photo, {
          headers: { Cookie: cookie },
        })
      ).status,
      404,
    );
  }
  assert.deepEqual(errors, []);
  assert.deepEqual(
    await query(
      readOnly
        ? "SELECT * FROM editorial_board ORDER BY member_id"
        : "SELECT * FROM editorial_board WHERE journal_id<>? ORDER BY member_id",
      readOnly ? [] : [journalId],
    ),
    original,
  );
  console.log(
    "PASS: editorial board " +
      (readOnly
        ? "read-only list/search/pagination, edit/reload/cancel, add form"
        : "CRUD, journal scope, public visibility, private email, audit fields, URL validation, delete confirmation") +
      ", authentication/CSRF, separate pages, mobile layout; existing members unchanged.",
  );
} finally {
  if (browser) await browser.close();
  if (child) child.kill();
  const photos = journalId
    ? await query(
        "SELECT profile_photo FROM editorial_board WHERE journal_id=?",
        [journalId],
      )
    : [];
  if (journalId)
    await root(
      `DELETE FROM ijcsitr.editorial_board WHERE journal_id=${Number(journalId)} AND created_userid=${Number(userId)}; DELETE FROM ijcsitr.journal WHERE journal_id=${Number(journalId)} AND created_userid=${Number(userId)};`,
    );
  for (const row of photos) await removeUnusedBoardPhoto(row.profile_photo);
  if (userId)
    await root(
      `DELETE FROM ijcsitr.users WHERE user_id=${Number(userId)} AND user_name='${username}';`,
    );
  await db.end();
  console.log("Temporary board test records and account removed.");
}
