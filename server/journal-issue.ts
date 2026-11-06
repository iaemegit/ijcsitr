import { Router } from "express";
import { z } from "zod";
import { transaction, query } from "./db";
import { currentJournal } from "./journal";
import path from "node:path";
import { unlink } from "node:fs/promises";
import {
  parseIssueUpload,
  prepareIssueUploads,
  writeIssueUploads,
  issueUploadDirectory,
  IssueUploadError,
} from "./journal-issue-upload";
export const journalIssues = Router();
export const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const text = z.string().trim().max(255).nullable().default(null);
export const issueSchema = z
  .object({
    year: z.string().regex(/^\d{4}$/, "Enter a four-digit year."),
    volume_no: z
      .string()
      .trim()
      .regex(/^[1-9]\d{0,8}$/, "Enter a positive volume number."),
    issue_no: z
      .string()
      .trim()
      .regex(/^[1-9]\d{0,8}$/, "Enter a positive issue number."),
    from_month: z.enum(months),
    to_month: z.enum(months),
    title: text,
    special_issue: z.enum(["Yes", "No"]),
    special_issue_title: text,
    status: z.union([z.literal(0), z.literal(1), z.null()]),
    cover_image: z.string().trim().max(2000).nullable().default(null),
    file_path: text,
    table_of_contents: text,
  })
  .superRefine((data, ctx) => {
    if (months.indexOf(data.to_month) < months.indexOf(data.from_month))
      ctx.addIssue({
        code: "custom",
        path: ["to_month"],
        message: "End month must be on or after start month.",
      });
    if (data.special_issue === "Yes" && !data.special_issue_title)
      ctx.addIssue({
        code: "custom",
        path: ["special_issue_title"],
        message: "Enter a special issue title.",
      });
  });
const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const articleMatch = "journal_id=? AND year=? AND volume=? AND issue=?";
journalIssues.get("/", async (req, res) => {
  const { q, page, limit, sort } = z
    .object({
      q: z.string().trim().max(200).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
      sort: z.enum(["oldest", "newest"]).default("newest"),
    })
    .parse(req.query);
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  const term = "%" + q.replace(/[!%_]/g, (value) => "!" + value) + "%";
  const where =
    "WHERE journals_id=?" +
    (q
      ? " AND (title LIKE ? ESCAPE '!' OR special_issue_title LIKE ? ESCAPE '!' OR year LIKE ? ESCAPE '!' OR volume_no LIKE ? ESCAPE '!' OR issue_no LIKE ? ESCAPE '!' OR CAST(issue_id AS CHAR) LIKE ? ESCAPE '!')"
      : "");
  const params = [journal.journal_id, ...(q ? Array(6).fill(term) : [])];
  const direction = sort === "oldest" ? "ASC" : "DESC";
  const [issues, count] = await Promise.all([
    query(
      `SELECT * FROM journal_issue ${where} ORDER BY CAST(year AS UNSIGNED) ${direction},CAST(volume_no AS UNSIGNED) ${direction},CAST(issue_no AS UNSIGNED) ${direction},issue_id ${direction} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    ),
    query(`SELECT COUNT(*) total FROM journal_issue ${where}`, params),
  ]);
  res.json({
    issues,
    total: count[0].total,
    page,
    limit,
    journal: {
      journal_id: journal.journal_id,
      journal_name: journal.journal_name,
    },
  });
});
journalIssues.get("/options", async (req, res) => {
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  res.json({
    journal: {
      journal_id: journal.journal_id,
      journal_name: journal.journal_name,
    },
  });
});
journalIssues.get("/files/:filename", async (req, res) => {
  const filename = req.params.filename;
  if (!/^[a-f0-9-]{36}\.(pdf|webp)$/.test(filename))
    return res.status(404).json({ error: "File not found." });
  const journal = await currentJournal(),
    url = "/api/admin/journal-issues/files/" + filename;
  const rows = journal
    ? await query(
        "SELECT issue_id FROM journal_issue WHERE journals_id=? AND (file_path=? OR cover_image=?) LIMIT 1",
        [journal.journal_id, url, url],
      )
    : [];
  if (!rows.length) return res.status(404).json({ error: "File not found." });
  res.set("Cache-Control", "no-store").set("X-Content-Type-Options", "nosniff");
  res.sendFile(path.join(issueUploadDirectory, filename), (error) => {
    if (error && !res.headersSent)
      res.status(404).json({ error: "File not found." });
  });
});
journalIssues.get("/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id),
    journal = await currentJournal();
  const row =
    journal &&
    (
      await query(
        "SELECT * FROM journal_issue WHERE issue_id=? AND journals_id=?",
        [id, journal.journal_id],
      )
    )[0];
  if (!row) return res.status(404).json({ error: "Journal issue not found." });
  res.json({ issue: row });
});
// Lock the parent journal so duplicate checks and issue mutations serialize.
async function mutate(req, res, mode) {
  const id = mode === "create" ? null : idSchema.parse(req.params.id);
  let body = req.body;
  if (req.is("multipart/form-data")) {
    try {
      body = JSON.parse(req.body.data);
    } catch {
      return res
        .status(400)
        .json({ error: "Invalid journal issue form data." });
    }
  }
  const data = mode === "delete" ? null : issueSchema.parse(body);
  let prepared;
  try {
    prepared = await prepareIssueUploads(req.files);
  } catch (error) {
    if (error instanceof IssueUploadError)
      return res.status(400).json({ error: error.message });
    throw error;
  }
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  const createdPaths: string[] = [];
  const deletedUrls: string[] = [];
  try {
    const outcome = await transaction(async (connection) => {
      await connection.execute(
        "SELECT journal_id FROM journal WHERE journal_id=? FOR UPDATE",
        [journal.journal_id],
      );
      const [rows] = id
        ? await connection.execute(
            "SELECT * FROM journal_issue WHERE issue_id=? AND journals_id=? FOR UPDATE",
            [id, journal.journal_id],
          )
        : [[]];
      const row = rows[0];
      if (mode === "delete" && row)
        for (const url of [row.file_path, row.cover_image])
          if (
            /^\/api\/admin\/journal-issues\/files\/[a-f0-9-]{36}\.(pdf|webp)$/.test(
              url || "",
            )
          )
            deletedUrls.push(url);
      if (id && !row) {
        return res.status(404).json({ error: "Journal issue not found." });
      }
      if (
        row &&
        (mode === "delete" ||
          (data &&
            ["year", "volume_no", "issue_no"].some(
              (key) => data[key] !== row[key],
            )))
      ) {
        const [references] = await connection.execute(
          `SELECT article_id FROM article WHERE ${articleMatch} LIMIT 1`,
          [journal.journal_id, row.year, row.volume_no, row.issue_no],
        );
        if (references.length) {
          return res.status(409).json({
            error:
              "This issue contains articles. Its year, volume and issue number cannot be changed, and it cannot be deleted. You can still edit its other details.",
          });
        }
      }
      let result;
      if (mode === "delete")
        [result] = await connection.execute(
          "DELETE FROM journal_issue WHERE issue_id=? AND journals_id=?",
          [id, journal.journal_id],
        );
      else if (data) {
        const [duplicates] = await connection.execute(
          "SELECT issue_id FROM journal_issue WHERE journals_id=? AND year=? AND volume_no=? AND issue_no=? AND issue_id<>? LIMIT 1",
          [
            journal.journal_id,
            data.year,
            data.volume_no,
            data.issue_no,
            id || 0,
          ],
        );
        if (duplicates.length) {
          return res.status(409).json({
            error:
              "An issue with this year, volume and issue number already exists.",
          });
        }
        Object.assign(data, await writeIssueUploads(prepared, createdPaths));
        const fields = Object.keys(data);
        if (mode === "create")
          [result] = await connection.execute(
            `INSERT INTO journal_issue (${fields.join(",")},journals_id,created_date,created_userid,created_usertype) VALUES (${fields.map(() => "?").join(",")},?,NOW(6),?,1)`,
            [...Object.values(data), journal.journal_id, req.adminUser.user_id],
          );
        else
          [result] = await connection.execute(
            `UPDATE journal_issue SET ${fields.map((key) => key + "=?").join(",")},updated_date=NOW(6),updated_userid=?,updated_usertype=1 WHERE issue_id=? AND journals_id=?`,
            [
              ...Object.values(data),
              req.adminUser.user_id,
              id,
              journal.journal_id,
            ],
          );
      }
      connection.afterCommit(() =>
        res.status(mode === "create" ? 201 : 200).json({
          id: id || result.insertId,
          message: `Journal issue ${mode === "create" ? "created" : mode === "delete" ? "deleted" : "updated"} successfully.`,
        }),
      );
    });
    for (const url of deletedUrls) {
      try {
        const remaining = await query(
          "SELECT COUNT(*) total FROM journal_issue WHERE file_path=? OR cover_image=?",
          [url, url],
        );
        if (!remaining[0].total)
          await unlink(path.join(issueUploadDirectory, path.basename(url)));
      } catch {
        /* Retain a successful deletion response if file cleanup is unavailable. */
      }
    }
    return outcome;
  } catch (error) {
    await Promise.allSettled(createdPaths.map((file) => unlink(file)));
    throw error;
  }
}
journalIssues.post("/", parseIssueUpload, (req, res) =>
  mutate(req, res, "create"),
);
journalIssues.put("/:id", (req, res) => mutate(req, res, "update"));
journalIssues.delete("/:id", (req, res) => mutate(req, res, "delete"));
