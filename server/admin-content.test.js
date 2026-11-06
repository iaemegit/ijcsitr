import test from "node:test";
import assert from "node:assert/strict";
import { contentSchema } from "./admin-content.ts";
import { joinUsConfig } from "../src/pages/admin/join-us/join-us-config.ts";
import { onlinePapersConfig } from "../src/pages/admin/online-papers/online-papers-config.ts";
import { downloadsConfig } from "../src/pages/admin/downloads/downloads-config.ts";
import { testimonialConfig } from "../src/pages/admin/testimonial/testimonial-config.ts";
import { contactUsConfig } from "../src/pages/admin/contact-us/contact-us-config.ts";
test("admin content validates required fields, email and stored column limits", () => {
  for (const config of [
    joinUsConfig,
    onlinePapersConfig,
    downloadsConfig,
    testimonialConfig,
    contactUsConfig,
  ]) {
    const data = {
      ...Object.fromEntries(
        config.fields.map((field) => [
          field.key,
          field.type === "email"
            ? "member@example.org"
            : field.required
              ? "Example value"
              : "",
        ]),
      ),
      ...(config.status ? { status: 1 } : {}),
    };
    assert.equal(contentSchema(config).safeParse(data).success, true);
    const required = config.fields.find((field) => field.required);
    assert.equal(
      contentSchema(config).safeParse({ ...data, [required.key]: "" }).success,
      false,
    );
    const email = config.fields.find((field) => field.type === "email");
    if (email)
      assert.equal(
        contentSchema(config).safeParse({ ...data, [email.key]: "invalid" })
          .success,
        false,
      );
    const parsed = contentSchema(config).parse({
      ...data,
      created_userid: 999,
      updated_date: "1900-01-01",
      journal_id: 999,
    });
    for (const key of ["created_userid", "updated_date", "journal_id"])
      assert.equal(parsed[key], undefined);
  }
  assert.equal(
    contentSchema(contactUsConfig).safeParse({
      name: "Example",
      email_id: "member@example.org",
      subject: "Subject",
      message: "x".repeat(256),
    }).success,
    false,
  );
});
