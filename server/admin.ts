import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { transaction, query } from "./db";
import { affiliations } from "./affiliation";
import { authors } from "./author";
import { journal } from "./journal";
import { journalIssues } from "./journal-issue";
import {adminArticles} from './article-admin';
import {editorialBoard} from './editorial-board';
import {memberships} from './membership';
import {awards} from './awards';
import {callsForPapers} from './call-for-paper';
import {adminContent,adminContentFiles} from './admin-content';
import {
  createSessionStore,
  hashPassword,
  verifyPassword,
  equalSecret,
  fingerprint,
} from "./admin-security";
export const admin = Router();
const sessions = createSessionStore();
const adminId = Number(process.env.ADMIN_USER_ID || 1);
const cookieName = "ijcsitr_admin";
const cookieOptions = {
  httpOnly: true,
  sameSite: "strict" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/api/admin",
};
function token(req) {
  const cookie = req.headers.cookie
    ?.split(";")
    .find((value) => value.trim().startsWith(cookieName + "="));
  return cookie?.trim().slice(cookieName.length + 1);
}
admin.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
admin.use((req, res, next) => {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  if (req.get("X-Admin-Request") !== "1")
    return res.status(403).json({ error: "Invalid admin request." });
  if (req.get("Origin")) {
    try {
      if (new URL(req.get("Origin")!).host !== req.get("Host"))
        return res
          .status(403)
          .json({ error: "Cross-origin admin requests are not allowed." });
    } catch {
      return res.status(403).json({ error: "Invalid request origin." });
    }
  }
  next();
});
admin.post(
  "/login",
  rateLimit({
    windowMs: 15 * 60_000,
    limit: 8,
    skipSuccessfulRequests: true,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: "Too many login attempts. Please try again in 15 minutes.",
    },
  }),
  async (req, res) => {
    const data = z
      .object({
        username: z.string().trim().min(1).max(255),
        password: z.string().min(1).max(256),
      })
      .parse(req.body);
    const users = await query(
      "SELECT user_id,user_name,user_password FROM users WHERE user_id=?",
      [adminId],
    );
    const user = users[0];
    if (
      !user ||
      !equalSecret(data.username, user.user_name) ||
      !(await verifyPassword(data.password, user.user_password))
    ) {
      // Keep failed legacy/missing-account attempts computationally expensive too.
      await hashPassword("invalid-login");
      return res.status(401).json({ error: "Incorrect username or password." });
    }
    if (!user.user_password.startsWith("scrypt$")) {
      const hash = await hashPassword(data.password);
      const changed = await query(
        "UPDATE users SET user_password=?,user_updated_at=NOW(6) WHERE user_id=? AND BINARY user_password=BINARY ?",
        [hash, user.user_id, user.user_password],
      );
      if (!changed.affectedRows)
        return res
          .status(401)
          .json({ error: "Account changed. Please sign in again." });
      user.user_password = hash;
    }
    sessions.remove(token(req));
    const created = sessions.create(user);
    res.cookie(cookieName, created.token, {
      ...cookieOptions,
      maxAge: 8 * 60 * 60 * 1000,
    });
    res.json({
      user: { id: user.user_id, name: user.user_name },
      csrfToken: created.session.csrf,
    });
  },
);
admin.use(async (req, res, next) => {
  const session = sessions.get(token(req));
  if (!session)
    return res.status(401).json({ error: "Please sign in to continue." });
  const rows = await query(
    "SELECT user_id,user_name,user_password FROM users WHERE user_id=?",
    [adminId],
  );
  const user = rows[0];
  if (
    !user ||
    session.userId !== user.user_id ||
    !equalSecret(session.version, fingerprint(user.user_password))
  ) {
    sessions.remove(token(req));
    res.clearCookie(cookieName, cookieOptions);
    return res
      .status(401)
      .json({ error: "Your session has expired. Please sign in again." });
  }
  if (
    !["GET", "HEAD"].includes(req.method) &&
    !equalSecret(req.get("X-CSRF-Token") || "", session.csrf)
  )
    return res
      .status(403)
      .json({ error: "Session verification failed. Refresh and try again." });
  req.adminUser = user;
  req.adminSession = session;
  next();
});
admin.use("/affiliations", affiliations);
admin.use("/authors", authors);
admin.use("/journal", journal);
admin.use("/journal-issues", journalIssues);
admin.use('/articles',adminArticles);
  admin.use('/editorial-board',editorialBoard);
  admin.use('/memberships',memberships);
  admin.use('/awards',awards);
  admin.use('/calls-for-papers',callsForPapers);
  admin.use('/resources',adminContent);
  admin.use('/content-files',adminContentFiles);
admin.get("/session", (req, res) =>
  res.json({
    user: { id: req.adminUser!.user_id, name: req.adminUser!.user_name },
    csrfToken: req.adminSession!.csrf,
  }),
);
admin.post("/logout", (req, res) => {
  sessions.remove(token(req));
  res.clearCookie(cookieName, cookieOptions);
  res.json({ message: "Signed out." });
});
admin.get("/dashboard", async (req, res) => {
  const rows = await query(
    "SELECT (SELECT COUNT(*) FROM discipline) disciplines,(SELECT COUNT(*) FROM discipline WHERE status=1) activeDisciplines,(SELECT COUNT(*) FROM journal) journals",
  );
  res.json(rows[0]);
});
const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const disciplineSchema = z.object({
  discipline_name: z
    .string()
    .trim()
    .min(2, "Enter at least two characters.")
    .max(5000),
  department: z.string().trim().max(5000).default(""),
  status: z.union([z.literal(0), z.literal(1)]),
});
admin.get("/disciplines", async (req, res) => {
  const data = z
    .object({
      q: z.string().trim().max(200).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    })
    .parse(req.query);
  const term = "%" + data.q.replace(/[!%_]/g, (value) => "!" + value) + "%";
  const where = data.q
    ? "WHERE (d.discipline_name LIKE ? ESCAPE '!' OR d.department LIKE ? ESCAPE '!' OR CAST(d.discipline_id AS CHAR) LIKE ? ESCAPE '!')"
    : "";
  const params = data.q ? [term, term, term] : [];
  const [rows, count] = await Promise.all([
    query(
      `SELECT d.*, (SELECT COUNT(*) FROM journal j WHERE j.discipline_id=d.discipline_id) journal_count FROM discipline d ${where} ORDER BY d.discipline_id DESC LIMIT ${data.limit} OFFSET ${(data.page - 1) * data.limit}`,
      params,
    ),
    query(`SELECT COUNT(*) total FROM discipline d ${where}`, params),
  ]);
  res.json({
    disciplines: rows,
    total: count[0].total,
    page: data.page,
    limit: data.limit,
  });
});
admin.get("/disciplines/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const rows = await query("SELECT * FROM discipline WHERE discipline_id=?", [
    id,
  ]);
  if (!rows.length)
    return res.status(404).json({ error: "Discipline not found." });
  res.json({ discipline: rows[0] });
});
admin.post("/disciplines", async (req, res) => {
  const data = disciplineSchema.parse(req.body);
  const result = await query(
    "INSERT INTO discipline (discipline_name,department,status,created_date,created_userid,created_usertype) VALUES (?,?,?,NOW(6),?,1)",
    [
      data.discipline_name,
      data.department,
      data.status,
      req.adminUser!.user_id,
    ],
  );
  res.status(201).json({ id: result.insertId, message: "Discipline created." });
});
admin.put("/disciplines/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id),
    data = disciplineSchema.parse(req.body);
  const result = await query(
    "UPDATE discipline SET discipline_name=?,department=?,status=?,updated_date=NOW(6),updated_userid=?,updated_usertype=1 WHERE discipline_id=?",
    [
      data.discipline_name,
      data.department,
      data.status,
      req.adminUser!.user_id,
      id,
    ],
  );
  if (!result.affectedRows)
    return res.status(404).json({ error: "Discipline not found." });
  res.json({ message: "Discipline updated." });
});
admin.delete("/disciplines/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  return transaction(async (connection) => {
    const [rows] = await connection.execute(
      "SELECT discipline_id FROM discipline WHERE discipline_id=? FOR UPDATE",
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Discipline not found." });
    }
    await connection.execute(
      "UPDATE journal SET discipline_id=NULL,updated_date=NOW(6),updated_userid=?,updated_usertype=1 WHERE discipline_id=?",
      [req.adminUser!.user_id, id],
    );
    await connection.execute("DELETE FROM discipline WHERE discipline_id=?", [
      id,
    ]);
    connection.afterCommit(() => res.json({ message: "Discipline deleted." }));
  });
});
