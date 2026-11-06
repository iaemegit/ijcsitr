import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import multer from "multer";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { mkdirSync, existsSync, readFileSync, unlinkSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { db, query } from "./db";
import { plain, authorIds, safeUrl, sorts } from "./content";
import { admin } from "./admin";
import { articlePdfPattern, streamArticleFile } from "./article-upload";
import { canonicalPdfPattern } from "./article-documents";
import { currentJournal } from "./journal";
import { reviewerApplications } from "./reviewer-application";
const root = process.cwd();
const app = express();
app.disable("x-powered-by");
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        "script-src": ["'self'"],
        "style-src": ["'self'", "'unsafe-inline'"],
        "img-src": ["'self'", "data:", "blob:", "https:"],
      },
    },
  }),
);
app.use("/api/admin/journal", express.json({ limit: "256kb" }));
app.use("/api/admin/articles", express.json({ limit: "256kb" }));
app.use(express.json({ limit: "32kb" }));
app.use(
  "/media/journal-covers",
  express.static(path.join(root, "uploads/journal-covers"), {
    dotfiles: "deny",
    index: false,
  }),
);
app.use(
  "/api",
  rateLimit({
    windowMs: 60_000,
    limit: 180,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
const formLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
});
const articleFields =
  "a.article_id,a.article_key,a.article_title,a.abstract,a.author_ids,a.date_of_publication,a.doi,a.year,a.volume,a.issue,a.page_from,a.page_to,a.keywords,a.views,a.downloads,a.citation,a.article_file";
async function enrich(rows) {
  const ids = [...new Set(rows.flatMap((row) => authorIds(row.author_ids)))];
  const authors = ids.length
    ? await query(
        `SELECT author_id,first_name,last_name,university FROM author WHERE author_id IN (${ids.map(() => "?").join(",")})`,
        ids,
      )
    : [];
  const lookup = new Map(
    authors.map((a) => [
      Number(a.author_id),
      {
        id: a.author_id,
        name: `${plain(a.first_name)} ${plain(a.last_name)}`.trim(),
        university: plain(a.university),
      },
    ]),
  );
  return rows.map((row) => ({
    ...row,
    article_title: plain(row.article_title),
    abstract: plain(row.abstract),
    keywords: plain(row.keywords),
    ...(Object.hasOwn(row, "reference")
      ? { reference: plain(row.reference) }
      : {}),
    authors: authorIds(row.author_ids)
      .map((id) => lookup.get(id))
      .filter(Boolean),
    doi_url: safeUrl(
      row.doi?.startsWith("10.") ? `https://doi.org/${row.doi}` : row.doi,
    ),
    ...(Object.hasOwn(row, "article_file")
      ? {
          file_url:
            articlePdfPattern.test(row.article_file || "") ||
            canonicalPdfPattern.test(row.article_file || "")
              ? row.article_file
              : safeUrl(row.article_file),
        }
      : {}),
  }));
}
app.get("/api/health", async (req, res) => {
  let mysql = false;
  try {
    await query("SELECT 1");
    mysql = true;
  } catch {}
  res.status(mysql ? 200 : 503).json({ mysql, searchMode: "mysql" });
});
app.get("/api/journal", async (req, res) => {
  const [journals, counts, years, latest, issues] = await Promise.all([
    query(
      "SELECT journal_id,journal_name,journal_key,about_us,subject_area,issn_online,issn_print,start_year,publication_frequency,email FROM journal ORDER BY journal_id LIMIT 1",
    ),
    query(
      "SELECT (SELECT COUNT(*) FROM article WHERE status=1) articles,(SELECT COUNT(*) FROM author) authors,(SELECT COUNT(*) FROM journal_issue WHERE status=1) issues,(SELECT COUNT(DISTINCT country) FROM author WHERE country IS NOT NULL AND country != '') countries",
    ),
    query(
      "SELECT DISTINCT year FROM article WHERE status=1 ORDER BY CAST(year AS UNSIGNED) DESC",
    ),
    query(
      `SELECT ${articleFields} FROM article a WHERE a.status=1 ORDER BY a.date_of_publication DESC,a.article_id DESC LIMIT 3`,
    ),
    query(
      "SELECT issue_id,year,volume_no,issue_no,from_month,to_month FROM journal_issue WHERE status=1 ORDER BY CAST(year AS UNSIGNED) DESC,CAST(volume_no AS UNSIGNED) DESC,CAST(issue_no AS UNSIGNED) DESC LIMIT 1",
    ),
  ]);
  const journal = journals[0];
  if (!journal) return res.status(404).json({ error: "Journal not found" });
  res.json({
    journal: {
      ...journal,
      about_us: plain(journal.about_us),
      subject_area: plain(journal.subject_area),
    },
    stats: counts[0],
    years: years.map((r) => r.year),
    latest: await enrich(latest),
    currentIssue: issues[0] || null,
  });
});
const articleQuery = z.object({
  q: z.string().trim().max(250).default(""),
  year: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  volume: z
    .string()
    .regex(/^\d{1,4}$/)
    .optional(),
  issue: z
    .string()
    .regex(/^\d{1,4}$/)
    .optional(),
  sort: z
    .enum(["newest", "oldest", "title", "popular", "relevance"])
    .default("newest"),
  page: z.coerce.number().int().min(1).max(500).default(1),
  limit: z.coerce.number().int().min(1).max(24).default(6),
});
app.get("/api/articles", async (req, res) => {
  const filters = articleQuery.parse(req.query);
  const { q, year, volume, issue, sort, page, limit } = filters;
  const clauses = ["a.status=1"];
  const params: unknown[] = [];
  for (const [key, value] of Object.entries({ year, volume, issue }))
    if (value) {
      clauses.push(`a.${key}=?`);
      params.push(value);
    }
  if (q) {
    const escaped = q.replace(/[!%_]/g, (value) => "!" + value);
    clauses.push(
      "(a.article_key = ? OR CAST(a.article_id AS CHAR) = ? OR a.article_title LIKE ? ESCAPE '!' OR a.abstract LIKE ? ESCAPE '!' OR a.keywords LIKE ? ESCAPE '!' OR EXISTS (SELECT 1 FROM author au WHERE FIND_IN_SET(CAST(au.author_id AS CHAR),REPLACE(REPLACE(REPLACE(a.author_ids,'[',''),']',''),' ','')) > 0 AND CONCAT_WS(' ',au.first_name,au.last_name) LIKE ? ESCAPE '!'))",
    );
    params.push(q, q, ...Array(4).fill(`%${escaped}%`));
  }
  const where = clauses.join(" AND ");
  const relevanceTerm = "%" + q.replace(/[!%_]/g, (value) => "!" + value) + "%";
  const ranking =
    q && sort === "relevance"
      ? `(CASE WHEN a.article_key = ? OR CAST(a.article_id AS CHAR) = ? THEN 100 ELSE 0 END + CASE WHEN a.article_title LIKE ? ESCAPE '!' THEN 4 ELSE 0 END + CASE WHEN a.keywords LIKE ? ESCAPE '!' THEN 3 ELSE 0 END + CASE WHEN EXISTS (SELECT 1 FROM author au WHERE FIND_IN_SET(CAST(au.author_id AS CHAR),REPLACE(REPLACE(REPLACE(a.author_ids,'[',''),']',''),' ','')) > 0 AND CONCAT_WS(' ',au.first_name,au.last_name) LIKE ? ESCAPE '!') THEN 2 ELSE 0 END + CASE WHEN a.abstract LIKE ? ESCAPE '!' THEN 1 ELSE 0 END) DESC, ${sorts.newest}`
      : sorts[sort] || sorts.newest;
  const rankingParams =
    q && sort === "relevance" ? [q, q, ...Array(4).fill(relevanceTerm)] : [];
  const [rows, counts] = await Promise.all([
    query(
      `SELECT ${articleFields} FROM article a WHERE ${where} ORDER BY ${ranking} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      [...params, ...rankingParams],
    ),
    query(`SELECT COUNT(*) total FROM article a WHERE ${where}`, params),
  ]);
  res.json({
    articles: await enrich(rows),
    total: counts[0].total,
    page,
    limit,
    engine: "mysql",
  });
});
app.get("/api/articles/files/:filename", async (req, res) => {
  const url = "/api/articles/files/" + req.params.filename;
  if (!articlePdfPattern.test(url))
    return res.status(404).json({ error: "PDF not found." });
  const journal = await currentJournal();
  const rows = journal
    ? await query(
        "SELECT article_id FROM article WHERE journal_id=? AND (article_file=? OR article_pdf_storage=?) AND status=1 LIMIT 1",
        [journal.journal_id, url, url],
      )
    : [];
  if (!rows.length) return res.status(404).json({ error: "PDF not found." });
  return streamArticleFile(res, url);
});
app.get("/api/articles/:id", async (req, res) => {
  const id = z.coerce.number().int().positive().parse(req.params.id);
  const rows = await query(
    `SELECT ${articleFields},a.reference,a.date_of_acceptance,a.date_of_received FROM article a WHERE a.article_id=? AND a.status=1`,
    [id],
  );
  if (!rows.length) return res.status(404).json({ error: "Article not found" });
  const article = (await enrich(rows))[0];
  const related = await query(
    `SELECT ${articleFields} FROM article a WHERE a.status=1 AND a.article_id<>? AND a.year=? ORDER BY a.date_of_publication DESC LIMIT 3`,
    [id, article.year],
  );
  res.json({ article, related: await enrich(related) });
});
app.get("/api/issues", async (req, res) => {
  const rows = await query(
    `SELECT ji.issue_id,ji.year,ji.volume_no,ji.issue_no,ji.from_month,ji.to_month,ji.title,ji.special_issue_title,(SELECT COUNT(*) FROM article a WHERE a.status=1 AND a.journal_id=ji.journals_id AND a.year=ji.year AND a.volume=ji.volume_no AND a.issue=ji.issue_no) article_count FROM journal_issue ji WHERE ji.status=1 ORDER BY CAST(ji.year AS UNSIGNED) DESC,CAST(ji.volume_no AS UNSIGNED) DESC,CAST(ji.issue_no AS UNSIGNED) DESC`,
  );
  res.json({
    issues: rows.map((r) => ({
      ...r,
      title: plain(r.title),
      special_issue_title: plain(r.special_issue_title),
    })),
  });
});
app.get("/api/editors", async (req, res) => {
  const journal = await currentJournal();
  if (!journal) return res.json({ editors: [] });
  const rows = await query(
    "SELECT member_id,prefix,editor_name,editor_affiliation,editor_type,orcid_link,google_scholar_profile,institutional_profile FROM editorial_board WHERE journal_id=? AND status=1 ORDER BY CASE editor_type WHEN 'Editor-in-Chief' THEN 0 WHEN 'Associate Editor' THEN 1 ELSE 2 END,editor_name",
    [journal.journal_id],
  );
  res.json({
    editors: rows.map((r) => ({
      id: r.member_id,
      name: plain(r.editor_name),
      prefix: plain(r.prefix),
      affiliation: plain(r.editor_affiliation),
      role: plain(r.editor_type),
      profile:
        safeUrl(r.institutional_profile) ||
        safeUrl(r.orcid_link) ||
        safeUrl(r.google_scholar_profile),
    })),
  });
});
const uploadPath = path.join(root, "uploads");
mkdirSync(uploadPath, { recursive: true });
const upload = multer({
  storage: multer.diskStorage({
    destination: uploadPath,
    filename: (req, file, done) => done(null, randomUUID() + ".pdf"),
  }),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 10,
    fieldSize: 20000,
  },
  fileFilter: (req, file, done) =>
    done(
      null,
      file.mimetype === "application/pdf" &&
        path.extname(file.originalname).toLowerCase() === ".pdf",
    ),
});
const submissionSchema = z.object({
  article_title: z.string().trim().min(10).max(500),
  author_name: z.string().trim().min(2).max(200),
  email: z.email().max(255),
  country: z.string().trim().min(2).max(100),
  keywords: z.string().trim().min(3).max(2000),
  discipline_title: z.string().trim().min(2).max(200),
  consent: z.literal("true"),
});
app.post(
  "/api/submissions",
  formLimiter,
  upload.single("manuscript"),
  async (req, res, next) => {
    try {
      const data = submissionSchema.parse(req.body);
      if (!req.file)
        return res
          .status(400)
          .json({ error: "Please attach a PDF manuscript (up to 10 MB)." });
      const header = readFileSync(req.file.path).subarray(0, 5).toString();
      if (header !== "%PDF-") {
        unlinkSync(req.file.path);
        return res
          .status(400)
          .json({ error: "The uploaded file is not a valid PDF." });
      }
      const journal = await query(
        "SELECT journal_id FROM journal ORDER BY journal_id LIMIT 1",
      );
      const result = await query(
        "INSERT INTO article_submission (article_title,author_name,email,country,keywords,discipline_title,journal_id,created_date,status,upload_manuscript) VALUES (?,?,?,?,?,?,?,NOW(6),0,?)",
        [
          data.article_title,
          data.author_name,
          data.email,
          data.country,
          data.keywords,
          data.discipline_title,
          String(journal[0].journal_id),
          req.file.filename,
        ],
      );
      res.status(201).json({
        id: result.insertId,
        message: "Your manuscript has been received for editorial review.",
      });
    } catch (error) {
      if (req.file && existsSync(req.file.path)) unlinkSync(req.file.path);
      next(error);
    }
  },
);
app.post("/api/contact", formLimiter, async (req, res) => {
  const data = z
    .object({
      name: z.string().trim().min(2).max(150),
      email: z.email().max(255),
      subject: z.string().trim().min(3).max(200),
      message: z.string().trim().min(10).max(255),
    })
    .parse(req.body);
  const result = await query(
    "INSERT INTO contactus (name,email_id,subject,message,created_date) VALUES (?,?,?,?,NOW(6))",
    [data.name, data.email, data.subject, data.message],
  );
  res.status(201).json({
    id: result.insertId,
    message: "Your message has been sent to the editorial office.",
  });
});
app.use(
  "/api/join",
  (req, res, next) =>
    req.method === "GET" ? next() : formLimiter(req, res, next),
  reviewerApplications,
);
app.use("/api/admin", admin);
app.use("/api", (req, res) =>
  res.status(404).json({ error: "API endpoint not found" }),
);
if (existsSync(path.join(root, "dist/index.html"))) {
  app.use(express.static(path.join(root, "dist")));
  app.get("/{*path}", (req, res) =>
    res.sendFile(path.join(root, "dist/index.html")),
  );
}
app.use((error, req, res, next) => {
  if (error instanceof z.ZodError)
    return res.status(400).json({
      error: "Please check your input.",
      fields: error.flatten().fieldErrors,
    });
  if (error instanceof multer.MulterError)
    return res.status(400).json({
      error:
        error.code === "LIMIT_FILE_SIZE"
          ? "The PDF must be 10 MB or smaller."
          : "The upload could not be accepted.",
    });
  if (error.type === "entity.parse.failed")
    return res.status(400).json({ error: "Invalid JSON request." });
  if (error.type === "entity.too.large")
    return res.status(413).json({
      error:
        "The submitted content is too large. Please shorten the text and try again.",
    });
  console.error("Request failed:", error.code || error.name);
  res.status(500).json({
    error: "The service is temporarily unavailable. Please try again.",
  });
});
export default app;
