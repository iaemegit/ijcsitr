import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  createSessionStore,
  equalSecret,
} from "./admin-security.ts";
test("passwords are salted and incorrect/malformed passwords are rejected", async () => {
  const one = await hashPassword("test password 123"),
    two = await hashPassword("test password 123");
  assert.notEqual(one, two);
  assert.ok(await verifyPassword("test password 123", one));
  assert.equal(await verifyPassword("wrong", one), false);
  assert.equal(await verifyPassword("x", "scrypt$malformed"), false);
  assert.equal(await verifyPassword("x", null), false);
});
test("migrated passwords compare exactly and secrets are not case insensitive", async () => {
  assert.ok(await verifyPassword("OldPassword", "OldPassword"));
  assert.equal(await verifyPassword("oldpassword", "OldPassword"), false);
  assert.equal(equalSecret("TOKEN", "token"), false);
});
test("sessions expire, revoke, and receive independent CSRF tokens", () => {
  let now = 100;
  const store = createSessionStore({ now: () => now, ttl: 1000 });
  const user = { user_id: 1, user_password: "hashed" };
  const a = store.create(user),
    b = store.create(user);
  assert.notEqual(a.token, b.token);
  assert.notEqual(a.session.csrf, b.session.csrf);
  assert.equal(store.get("unknown"), null);
  assert.equal(store.get(a.token).userId, 1);
  store.remove(a.token);
  assert.equal(store.get(a.token), null);
  now = 1100;
  assert.equal(store.get(b.token), null);
});
