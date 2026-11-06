import { Router } from "express";
import { z } from "zod";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { query, transaction } from "./db";
import { currentJournal } from "./journal";
import { authorIds, plain, safeUrl } from "./content";
import { articleSchema } from "./article-schema";
import {
  articleDocuments,
  articlePdfLink,
  canonicalPdfPattern,
  pendingDocument,
  consumeDocument,
  wordPattern,
  streamWord,
  wordFilePath,
} from "./article-documents";
import {
  parseArticleUpload,
  validArticlePdf,
  writeArticlePdf,
  nameArticlePdf,
  removeArticleFiles,
  articlePdfPattern,
  articleUploadDirectory,
  streamArticleFile,
} from "./article-upload";
export const adminArticles = Router();
adminArticles.use(articleDocuments);
const idSchema = z.coerce.number().int().positive().max(2147483647);
const authorMatch =
  "FIND_IN_SET(CAST(au.author_id AS CHAR),REPLACE(REPLACE(REPLACE(a.author_ids,'[',''),']',''),' ',''))>0";
async function withAuthors(rows: any[]) {
  const ids = [...new Set(rows.flatMap((row) => authorIds(row.author_ids)))];
  const authors = ids.length
    ? await query(
        `SELECT author_id,first_name,last_name,department,university,country FROM author WHERE author_id IN (${ids.map(() => "?").join(",")})`,
        ids,
      )
    : [];
  const lookup = new Map(authors.map((author) => [author.author_id, author]));
  return rows.map((row) => ({
    ...row,
    author_ids: authorIds(row.author_ids),
    authors: authorIds(row.author_ids).map(
      (id) =>
        lookup.get(id) || {
          author_id: id,
          first_name: "Missing author #" + id,
          last_name: "",
          university: "",
          country: "",
        },
    ),
  }));
}
adminArticles.get("/", async (req, res) => {
  const { q, page, limit, status } = z
    .object({
      q: z.string().trim().max(200).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
      status: z.enum(["0", "1"]).optional(),
    })
    .parse(req.query);
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  const clauses = ["a.journal_id=?"],
    params: unknown[] = [journal.journal_id];
  if (status !== undefined) {
    clauses.push("a.status=?");
    params.push(Number(status));
  }
  if (q) {
    const term = "%" + q.replace(/[!%_]/g, (value) => "!" + value) + "%";
    clauses.push(
      `(a.article_title LIKE ? ESCAPE '!' OR a.article_key LIKE ? ESCAPE '!' OR a.doi LIKE ? ESCAPE '!' OR a.year LIKE ? ESCAPE '!' OR CAST(a.article_id AS CHAR) LIKE ? ESCAPE '!' OR EXISTS(SELECT 1 FROM author au WHERE ${authorMatch} AND CONCAT_WS(' ',au.first_name,au.last_name) LIKE ? ESCAPE '!'))`,
    );
    params.push(...Array(6).fill(term));
  }
  const where = "WHERE " + clauses.join(" AND ");
  const [rows, count] = await Promise.all([
    query(
      `SELECT a.article_id,a.article_title,a.article_key,a.author_ids,a.year,a.volume,a.issue,a.date_of_publication,a.status,a.article_file FROM article a ${where} ORDER BY a.article_id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    ),
    query(`SELECT COUNT(*) total FROM article a ${where}`, params),
  ]);
  res.json({
    articles: await withAuthors(rows),
    total: count[0].total,
    page,
    limit,
    journal: {
      journal_id: journal.journal_id,
      journal_name: journal.journal_name,
    },
  });
});
adminArticles.get("/options", async (req, res) => {
  const journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  const issues = await query(
    "SELECT issue_id,year,volume_no,issue_no,from_month,to_month,status FROM journal_issue WHERE journals_id=? ORDER BY CAST(year AS UNSIGNED) DESC,CAST(volume_no AS UNSIGNED) DESC,CAST(issue_no AS UNSIGNED) DESC",
    [journal.journal_id],
  );
  res.json({
    journal: {
      journal_id: journal.journal_id,
      journal_name: journal.journal_name,
    },
    issues,
  });
});
adminArticles.get("/:id/file", async (req, res) => {
  const id = idSchema.parse(req.params.id),
    journal = await currentJournal();
  const row =
    journal &&
    (
      await query(
        "SELECT article_file,article_pdf_storage FROM article WHERE article_id=? AND journal_id=?",
        [id, journal.journal_id],
      )
    )[0];
  if (!row) return res.status(404).json({ error: "Article not found." });
  return streamArticleFile(
    res,
    row.article_pdf_storage || row.article_file || "",
  );
});
adminArticles.get("/:id/word", async (req, res) => {
  const journal = await currentJournal();
  const rows = journal
    ? await query(
        "SELECT article_word_file FROM article WHERE article_id=? AND journal_id=?",
        [idSchema.parse(req.params.id), journal.journal_id],
      )
    : [];
  return rows[0]?.article_word_file
    ? streamWord(res, rows[0].article_word_file)
    : res.sendStatus(404);
});
adminArticles.get("/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id),
    journal = await currentJournal();
  const rows = journal
    ? await query("SELECT * FROM article WHERE article_id=? AND journal_id=?", [
        id,
        journal.journal_id,
      ])
    : [];
  if (!rows.length)
    return res.status(404).json({ error: "Article not found." });
  const [row] = await withAuthors(rows),
    issues = await query(
      "SELECT issue_id FROM journal_issue WHERE journals_id=? AND year=? AND volume_no=? AND issue_no=? ORDER BY issue_id LIMIT 1",
      [journal.journal_id, row.year, row.volume, row.issue],
    );
  res.json({ article: { ...row, issue_id: issues[0]?.issue_id || null } });
});
async function save(req, res, editing: boolean) {
  let body = req.body;
  if (req.is("multipart/form-data")) {
    try {
      body = JSON.parse(req.body.data);
    } catch {
      return res.status(400).json({ error: "Invalid article form data." });
    }
  }
  const data = articleSchema.parse(body),
    id = editing ? idSchema.parse(req.params.id) : null,
    journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Journal not found." });
  if (req.file && !validArticlePdf(req.file))
    return res.status(400).json({ error: "Choose a valid PDF article file." });
  if (!editing && !data.issue_id)
    return res.status(400).json({ error: "Select a journal issue." });
  const createdPaths: string[] = [],
    oldUrls: string[] = [];
  try {
    await transaction(async (connection) => {
      await connection.execute(
        "SELECT journal_id FROM journal WHERE journal_id=? FOR UPDATE",
        [journal.journal_id],
      );
      const [existing] = id
        ? await connection.execute(
            "SELECT * FROM article WHERE article_id=? AND journal_id=? FOR UPDATE",
            [id, journal.journal_id],
          )
        : [[]];
      const original = existing[0];
      if (id && !original)
        return res.status(404).json({ error: "Article not found." });
      let issue;
      if (data.issue_id) {
        const [rows] = await connection.execute(
          "SELECT year,volume_no,issue_no,from_month,to_month FROM journal_issue WHERE issue_id=? AND journals_id=? FOR SHARE",
          [data.issue_id, journal.journal_id],
        );
        issue = rows[0];
        if (!issue)
          return res.status(400).json({
            error:
              "The selected issue does not belong to this journal or no longer exists.",
          });
      } else if (original)
        issue = {
          year: original.year,
          volume_no: original.volume,
          issue_no: original.issue,
          from_month: original.month_from,
          to_month: original.month_to,
        };
      const [authors] = await connection.execute(
        `SELECT author_id FROM author WHERE author_id IN (${data.author_ids.map(() => "?").join(",")}) FOR SHARE`,
        data.author_ids,
      );
      if (authors.length !== data.author_ids.length)
        return res.status(400).json({
          error:
            "One or more selected authors no longer exist. Refresh and select the authors again.",
        });
      if (
        data.corresponding_author &&
        !data.author_ids.includes(Number(data.corresponding_author)) &&
        data.corresponding_author !== original?.corresponding_author
      )
        return res.status(400).json({
          error: "Choose a corresponding author from the selected authors.",
        });
      const key = data.article_key || original?.article_key || randomUUID();
      const pdfUpload = pendingDocument(
        data.pdf_upload_token,
        req.adminUser.user_id,
        "pdf",
      );
      const wordUpload = pendingDocument(
        data.word_upload_token,
        req.adminUser.user_id,
        "word",
      );
      if (
        (data.pdf_upload_token && !pdfUpload) ||
        (data.word_upload_token && !wordUpload)
      )
        return res.status(400).json({
          error: "Your upload has expired. Please upload the file again.",
        });
      const [duplicate] = await connection.execute(
        "SELECT article_id FROM article WHERE article_key=? AND article_id<>? LIMIT 1",
        [key, id || 0],
      );
      if (duplicate.length)
        return res.status(409).json({
          error: "This article key already exists. Enter a different key.",
        });
      let file = Object.hasOwn(body, "article_file")
        ? data.article_file || null
        : original?.article_file || null;
      let storage = original?.article_pdf_storage || null;
      let word = Object.hasOwn(body, "article_word_file")
        ? data.article_word_file || null
        : original?.article_word_file || null;
      if (word && word !== original?.article_word_file && !wordUpload)
        return res
          .status(400)
          .json({ error: "Use the Word Upload button to attach a document." });
      if (
        !req.file &&
        !pdfUpload &&
        file &&
        !articlePdfPattern.test(file) &&
        !safeUrl(file) &&
        file !== original?.article_file
      )
        return res
          .status(400)
          .json({ error: "Use an HTTP(S) PDF URL or upload a PDF." });
      if (
        !req.file &&
        !pdfUpload &&
        articlePdfPattern.test(file || "") &&
        file !== original?.article_file
      )
        return res.status(400).json({
          error: "Upload a PDF instead of reusing another article file.",
        });
      if (req.file) {
        file = await writeArticlePdf(req.file, createdPaths);
      }
      if (pdfUpload) file = pdfUpload.storage;
      if (!file)
        return res
          .status(400)
          .json({ error: "Upload the PDF before saving the article." });
      if (articlePdfPattern.test(file)) storage = file;
      else if (file !== original?.article_file) storage = null;
      if (storage) {
        try {
          file = articlePdfLink(key);
        } catch {
          return res.status(400).json({
            error:
              "Use letters, numbers, underscores or hyphens in Article Key (maximum 100 characters) for the PDF link.",
          });
        }
      }
      if (storage) {
        const previousName = storage;
        storage = await nameArticlePdf(storage, key, createdPaths);
        if (previousName !== storage) oldUrls.push(previousName);
      }
      if (wordUpload) word = wordUpload.storage;
      const previousStorage =
        original?.article_pdf_storage || original?.article_file;
      if (previousStorage && previousStorage !== (storage || file))
        oldUrls.push(previousStorage);
      if (original?.article_word_file && word !== original.article_word_file)
        oldUrls.push(original.article_word_file);
      const values = {
        article_title: data.article_title,
        article_key: key,
        abstract: data.abstract,
        keywords: data.keywords,
        reference: data.reference,
        copyright: data.date_of_publication.slice(0, 4),
        doi: data.doi,
        google_scholar: data.google_scholar,
        corresponding_author: data.corresponding_author,
        author_ids: JSON.stringify(data.author_ids),
        date_of_publication: data.date_of_publication,
        date_of_received: data.date_of_received || null,
        date_of_acceptance: data.date_of_acceptance || null,
        page_from: data.page_from,
        page_to: data.page_to,
        status: data.status,
        article_file: file,
        article_pdf_storage: storage,
        article_word_file: word,
        year: issue.year,
        volume: issue.volume_no,
        issue: issue.issue_no,
        month_from: issue.from_month,
        month_to: issue.to_month,
      };
      const keys = Object.keys(values);
      let result;
      if (editing)
        [result] = await connection.execute(
          `UPDATE article SET ${keys.map((key) => key + "=?").join(",")},updated_date=NOW(6),updated_userid=?,updated_usertype=1 WHERE article_id=? AND journal_id=?`,
          [
            ...Object.values(values),
            req.adminUser.user_id,
            id,
            journal.journal_id,
          ],
        );
      else
        [result] = await connection.execute(
          `INSERT INTO article(${keys.join(",")},journal_id,created_date,created_userid,created_usertype,views,downloads,citation,share_count) VALUES(${keys.map(() => "?").join(",")},?,NOW(6),?,1,0,0,0,0)`,
          [...Object.values(values), journal.journal_id, req.adminUser.user_id],
        );
      connection.afterCommit(() => {
        consumeDocument(data.pdf_upload_token);
        consumeDocument(data.word_upload_token);
        res.status(editing ? 200 : 201).json({
          id: id || result.insertId,
          message: `Article ${editing ? "updated" : "created"} successfully.`,
        });
      });
    });
    await cleanupFiles(oldUrls);
  } catch (error) {
    await removeArticleFiles(createdPaths);
    throw error;
  }
}
async function cleanupFiles(urls: string[]) {
  for (const url of urls) {
    const filename =
      articlePdfPattern.exec(url || "")?.[1] ||
      wordPattern.exec(url || "")?.[1];
    if (!filename) continue;
    try {
      const rows = await query(
        "SELECT article_id FROM article WHERE article_file=? OR article_pdf_storage=? OR article_word_file=? LIMIT 1",
        [url, url, url],
      );
      if (!rows.length)
        await removeArticleFiles([
          wordFilePath(url) || path.join(articleUploadDirectory, filename),
        ]);
    } catch {}
  }
}
adminArticles.post("/", parseArticleUpload, (req, res) =>
  save(req, res, false),
);
adminArticles.put("/:id", parseArticleUpload, (req, res) =>
  save(req, res, true),
);
adminArticles.delete("/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id),
    journal = await currentJournal();
  if (!journal) return res.status(404).json({ error: "Article not found." });
  let files: string[] = [];
  await transaction(async (connection) => {
    await connection.execute(
      "SELECT journal_id FROM journal WHERE journal_id=? FOR UPDATE",
      [journal.journal_id],
    );
    const [rows] = await connection.execute(
      "SELECT article_file,article_pdf_storage,article_word_file FROM article WHERE article_id=? AND journal_id=? FOR UPDATE",
      [id, journal.journal_id],
    );
    if (!rows.length)
      return res.status(404).json({ error: "Article not found." });
    files = [
      rows[0].article_pdf_storage || rows[0].article_file,
      rows[0].article_word_file,
    ].filter(Boolean);
    await connection.execute(
      "DELETE FROM article WHERE article_id=? AND journal_id=?",
      [id, journal.journal_id],
    );
    connection.afterCommit(() =>
      res.json({ message: "Article deleted successfully." }),
    );
  });
  await cleanupFiles(files);
});
