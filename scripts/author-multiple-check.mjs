import assert from "node:assert/strict";
export async function checkMultipleAffiliations({
  page,
  base,
  marker,
  query,
  call,
}) {
  const fixtures = [];
  for (const suffix of ["Alpha", "Beta", "Gamma"]) {
    const aff_name = marker + " Institution " + suffix;
    const result = await call("/affiliations", {
      method: "POST",
      status: 201,
      body: {
        aff_name,
        aff_code: suffix,
        address: suffix + " Road",
        country: "India",
        website: "",
        logo: "",
        alternate_name: "",
        papers_published: 0,
        status: 1,
      },
    });
    fixtures.push({ id: result.data.id, name: aff_name });
  }
  const data = {
    first_name: marker + " multi API",
    last_name: "",
    address: "ignored",
    university: "ignored",
    papers_published: 0,
    profile_views: 0,
    status: 1,
    affiliation_id: fixtures[1].id,
    affiliations: fixtures.map((aff, i) => ({
      affiliation_id: aff.id,
      department: "Department " + i,
    })),
  };
  await call("/authors", {
    method: "POST",
    body: { ...data, affiliation_id: 99999999 },
    status: 400,
  });
  await call("/authors", {
    method: "POST",
    body: {
      ...data,
      affiliations: [data.affiliations[0], data.affiliations[0]],
    },
    status: 400,
  });
  await call("/authors", {
    method: "POST",
    body: { ...data, affiliations: [] },
    status: 400,
  });
  const apiId = (
    await call("/authors", { method: "POST", body: data, status: 201 })
  ).data.id;
  let stored = (await call("/authors/" + apiId)).data.author;
  assert.equal(stored.affiliations.length, 3);
  assert.equal(stored.affiliation_id, fixtures[1].id);
  assert.equal(stored.university, fixtures[1].name);
  assert.equal(stored.department, "Department 1");
  await call("/affiliations/" + fixtures[1].id, {
    method: "DELETE",
    status: 409,
  });
  await call("/authors/" + apiId, {
    method: "PUT",
    body: { ...data, affiliation_id: fixtures[2].id },
  });
  stored = (await call("/authors/" + apiId)).data.author;
  assert.equal(stored.university, fixtures[2].name);
  assert.equal(stored.department, "Department 2");
  await call("/authors/" + apiId, { method: "DELETE" });
  assert.equal(
    (
      await query(
        "SELECT COUNT(*) total FROM author_affiliation WHERE author_id=?",
        [apiId],
      )
    )[0].total,
    0,
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/portal/admin/author/add");
  await page.getByLabel("Author Full Name").fill(marker + " multi browser");
  await page
    .getByLabel("Affiliation", { exact: false })
    .fill(marker + " Institution");
  await page.getByRole("dialog", { name: "Select affiliations" }).waitFor(); // typing opens the popup automatically
  const dialog = page.getByRole("dialog");
  for (const fixture of fixtures)
    await dialog
      .locator(
        '[data-affiliation-id="' + fixture.id + '"] input[type=checkbox]',
      )
      .check();
  await dialog
    .getByRole("radio", {
      name: "Primary affiliation: " + fixtures[1].name,
      exact: true,
    })
    .check();
  await page.screenshot({
    path: ".local/screenshots/author-affiliations-popup.png",
    fullPage: true,
  });
  await dialog
    .getByRole("button", { name: "Use selected affiliations" })
    .click();
  await dialog.waitFor({ state: "detached" });
  let card = page.locator(".author-selected-affiliation");
  assert.equal(await card.count(), 1);
  assert.ok((await card.innerText()).includes(fixtures[1].name));
  assert.ok(!(await card.innerText()).includes(fixtures[0].name));
  assert.equal(
    await page.locator("#author-affiliation-search").inputValue(),
    fixtures[1].name,
  );
  await page
    .getByLabel("Department", { exact: true })
    .fill("Primary Beta Department");
  await page.getByRole("button", { name: "Create author" }).click();
  await page.waitForURL("**/portal/admin/author");
  const id = (
    await query("SELECT author_id FROM author WHERE first_name=?", [
      marker + " multi browser",
    ])
  )[0].author_id;
  await page.getByLabel("Search authors").fill(marker + " multi browser");
  const row = page
    .locator("tbody tr")
    .filter({ hasText: marker + " multi browser" });
  await row.waitFor();
  assert.ok((await row.innerText()).includes(fixtures[1].name));
  assert.ok(!(await row.innerText()).includes(fixtures[0].name));
  await page.goto(base + "/portal/admin/author/edit?id=" + id);
  await page.reload();
  await page.getByLabel("Department", { exact: true }).waitFor();
  assert.equal(
    await page.getByLabel("Department", { exact: true }).inputValue(),
    "Primary Beta Department",
  );
  await page.getByRole("button", { name: "Manage affiliations" }).click();
  await dialog
    .getByRole("radio", {
      name: "Primary affiliation: " + fixtures[1].name,
      exact: true,
    })
    .waitFor();
  await dialog.locator("input[type=checkbox]:checked").first().waitFor();
  assert.equal(await dialog.locator("input[type=checkbox]:checked").count(), 3);
  await dialog
    .getByRole("radio", {
      name: "Primary affiliation: " + fixtures[2].name,
      exact: true,
    })
    .check();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  assert.ok((await card.innerText()).includes(fixtures[1].name));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Manage affiliations" }).click();
  await dialog
    .getByRole("radio", {
      name: "Primary affiliation: " + fixtures[2].name,
      exact: true,
    })
    .check();
  assert.ok(
    await dialog.evaluate((el) => el.scrollWidth <= el.clientWidth),
    "Affiliation popup overflows on mobile",
  );
  await dialog
    .getByRole("button", { name: "Use selected affiliations" })
    .click();
  await page
    .getByLabel("Department", { exact: true })
    .fill("Primary Gamma Department");
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL("**/portal/admin/author");
  stored = (await call("/authors/" + id)).data.author;
  assert.equal(stored.affiliations.length, 3);
  assert.equal(stored.affiliation_id, fixtures[2].id);
  assert.equal(
    stored.affiliations.find((aff) => aff.aff_id === fixtures[1].id).department,
    "Primary Beta Department",
  );
  await page.goto(base + "/portal/admin/author/edit?id=" + id);
  await page.getByLabel("Department", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Manage affiliations" }).click();
  await dialog
    .locator(
      '[data-affiliation-id="' + fixtures[2].id + '"] input[type=checkbox]',
    )
    .uncheck();
  await dialog
    .getByRole("button", { name: "Use selected affiliations" })
    .click();
  await page.getByRole("button", { name: "Save changes" }).click();
  await page.waitForURL("**/portal/admin/author");
  stored = (await call("/authors/" + id)).data.author;
  assert.equal(stored.affiliations.length, 2);
  assert.ok(
    stored.affiliations.some((aff) => aff.aff_id === stored.affiliation_id),
  );
  await call("/authors/" + id, { method: "DELETE" });
  for (const fixture of fixtures)
    await call("/affiliations/" + fixture.id, { method: "DELETE" });
  console.log(
    "PASS: checkbox popup, three affiliations, exactly one primary, department persistence, cancel, refresh, primary-only display, mobile layout, removal/promotion, and transactional link cleanup.",
  );
}
