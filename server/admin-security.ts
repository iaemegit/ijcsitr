import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import type { ScryptOptions } from "node:crypto";
const scrypt = (
  password: string,
  salt: string,
  length: number,
  options: ScryptOptions,
): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    scryptCallback(password, salt, length, options, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  );
export function fingerprint(value) {
  return createHash("sha256").update(String(value)).digest("hex");
}
export function equalSecret(a, b) {
  return timingSafeEqual(
    Buffer.from(fingerprint(a), "hex"),
    Buffer.from(fingerprint(b), "hex"),
  );
}
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt}$${hash.toString("hex")}`;
}
export async function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!stored.startsWith("scrypt$")) return equalSecret(password, stored);
  const parts = stored.split("$");
  if (
    parts.length !== 3 ||
    !/^[a-f0-9]{32}$/.test(parts[1]) ||
    !/^[a-f0-9]{128}$/.test(parts[2])
  )
    return false;
  const hash = await scrypt(password, parts[1], 64, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(hash, Buffer.from(parts[2], "hex"));
}
export function createSessionStore({
  now = Date.now,
  ttl = 8 * 60 * 60 * 1000,
} = {}) {
  const sessions = new Map();
  return {
    create(user) {
      for (const [key, value] of sessions)
        if (value.expires <= now()) sessions.delete(key);
      if (sessions.size >= 1000) sessions.delete(sessions.keys().next().value);
      const token = randomBytes(32).toString("hex");
      const session = {
        userId: user.user_id,
        version: fingerprint(user.user_password),
        csrf: randomBytes(32).toString("hex"),
        expires: now() + ttl,
      };
      sessions.set(fingerprint(token), session);
      return { token, session };
    },
    get(token) {
      if (!token) return null;
      const key = fingerprint(token),
        session = sessions.get(key);
      if (!session) return null;
      if (session.expires <= now()) {
        sessions.delete(key);
        return null;
      }
      return session;
    },
    remove(token) {
      if (token) sessions.delete(fingerprint(token));
    },
  };
}
