import { Router } from "express";
import { z } from "zod";
import { transaction, query } from "./db";
import { authorIds } from "./content";
export const authors = Router();
const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const text = z.string().trim().max(5000).default("");
const counter = z.number().int().min(0).max(2147483647);
const schema = z
  .object({
    first_name: z.string().trim().min(1).max(5000),
    last_name: text,
    prefix: text,
    author_code: text,
    alternate_name: text,
    address: text,
    country: text,
    department: text,
    designation: text,
    university: text,
    logo: text,
    papers_published: counter,
    profile_views: counter,
    status: z.union([z.literal(0), z.literal(1)]),
    email: z.union([z.email().max(255), z.literal("")]).default(""),
    affiliation_id: z
      .number()
      .int()
      .positive()
      .max(Number.MAX_SAFE_INTEGER)
      .nullable()
      .default(null),
  })
  .refine((data) => Boolean(data.university || data.affiliation_id), {
    path: ["university"],
    message: "Enter an institution or select a country-only affiliation.",
  });
const fields = [
  "first_name",
  "last_name",
  "prefix",
  "author_code",
  "alternate_name",
  "address",
  "country",
  "department",
  "designation",
  "university",
  "logo",
  "papers_published",
  "profile_views",
  "status",
  "email",
  "affiliation_id",
];
authors.get("/", async (req, res) => {
  const { q, page, limit } = z
    .object({
      q: z.string().trim().max(200).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    })
    .parse(req.query);
  const searchable = [
    "CONCAT_WS(' ',first_name,last_name)",
    "author_code",
    "alternate_name",
    "country",
    "department",
    "designation",
    "university",
    "CAST(author_id AS CHAR)",
    "email",
  ];
  const where = q
    ? "WHERE " +
      searchable.map((field) => `${field} LIKE ? ESCAPE '!'`).join(" OR ")
    : "";
  const params = q
    ? Array(searchable.length).fill(
        "%" + q.replace(/[!%_]/g, (value) => "!" + value) + "%",
      )
    : [];
  const exactId = /^[1-9]\d*$/.test(q) && Number.isSafeInteger(Number(q));
  const [rows, count, articles] = await Promise.all([
    query(
      `SELECT * FROM author ${where} ORDER BY ${exactId ? "(author_id=?) DESC," : ""}author_id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      exactId ? [...params, Number(q)] : params,
    ),
    query(`SELECT COUNT(*) total FROM author ${where}`, params),
    query("SELECT author_ids FROM article"),
  ]);
  const counts = new Map();
  for (const article of articles)
    for (const id of authorIds(article.author_ids))
      counts.set(id, (counts.get(id) || 0) + 1);
  res.json({
    authors: rows.map((row) => ({
      ...row,
      article_count: counts.get(Number(row.author_id)) || 0,
    })),
    total: count[0].total,
    page,
    limit,
  });
});
authors.get("/:id", async (req, res) => {
  const rows = await query("SELECT * FROM author WHERE author_id=?", [
    idSchema.parse(req.params.id),
  ]);
  if (!rows.length) return res.status(404).json({ error: "Author not found." });
  const affiliation = rows[0].affiliation_id
    ? (
        await query(
          "SELECT aff_id,aff_name,address,country FROM affiliation WHERE aff_id=?",
          [rows[0].affiliation_id],
        )
      )[0] || null
    : null;
  const affiliations = await query(
    "SELECT a.aff_id,a.aff_name,a.address,a.country,aa.department FROM author_affiliation aa JOIN affiliation a ON a.aff_id=aa.affiliation_id WHERE aa.author_id=? ORDER BY aa.display_order,aa.affiliation_id",
    [rows[0].author_id],
  );
  res.json({
    author: {
      ...rows[0],
      affiliation,
      affiliations: affiliations.length
        ? affiliations
        : affiliation
          ? [{ ...affiliation, department: rows[0].department || "" }]
          : [],
    },
  });
});
const multipleAffiliations = z
  .object({
    affiliation_id: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    affiliations: z
      .array(
        z.object({
          affiliation_id: z
            .number()
            .int()
            .positive()
            .max(Number.MAX_SAFE_INTEGER),
          department: text,
        }),
      )
      .min(1)
      .max(20),
  })
  .superRefine((value, context) => {
    const ids = value.affiliations.map((item) => item.affiliation_id);
    if (new Set(ids).size !== ids.length)
      context.addIssue({
        code: "custom",
        path: ["affiliations"],
        message: "Select each affiliation only once.",
      });
    if (!ids.includes(value.affiliation_id))
      context.addIssue({
        code: "custom",
        path: ["affiliation_id"],
        message: "Choose a primary affiliation from the selected affiliations.",
      });
  });
async function resolveAffiliation(body) {
  if (body.affiliations !== undefined) {
    const parsed = multipleAffiliations.parse(body),
      ids = parsed.affiliations.map((item) => item.affiliation_id);
    const rows = await query(
      `SELECT aff_id,aff_name,address,country FROM affiliation WHERE aff_id IN (${ids.map(() => "?").join(",")})`,
      ids,
    );
    if (rows.length !== ids.length) return null;
    const primary = rows.find(
      (row) => Number(row.aff_id) === parsed.affiliation_id,
    )!;
    return {
      ...body,
      affiliation_id: parsed.affiliation_id,
      university: primary.aff_name,
      address: primary.address,
      country: primary.country,
      department: parsed.affiliations.find(
        (item) => item.affiliation_id === parsed.affiliation_id,
      )!.department,
      _affiliations: parsed.affiliations,
    };
  }
  if (body.affiliation_id) {
    const id = idSchema.parse(body.affiliation_id);
    const rows = await query(
      "SELECT aff_id,aff_name,address,country FROM affiliation WHERE aff_id=?",
      [id],
    );
    if (!rows.length) return null;
    return {
      ...body,
      university: rows[0].aff_name,
      address: rows[0].address,
      country: rows[0].country,
      _affiliations: [
        { affiliation_id: id, department: body.department || "" },
      ],
    };
  }
  return { ...body, _affiliations: [] };
}
async function saveAffiliations(connection, authorId, items) {
  await connection.execute("DELETE FROM author_affiliation WHERE author_id=?", [
    authorId,
  ]);
  for (const [order, item] of items.entries())
    await connection.execute(
      "INSERT INTO author_affiliation (author_id,affiliation_id,department,display_order) VALUES (?,?,?,?)",
      [authorId, item.affiliation_id, item.department, order],
    );
}
authors.post("/", async (req, res) => {
  const resolved = await resolveAffiliation(req.body);
  if (!resolved)
    return res.status(400).json({
      error:
        "The selected affiliation no longer exists. Please select another.",
    });
  const data = schema.parse(resolved);
  return transaction(async (connection) => {
    const [result] = await connection.execute(
      `INSERT INTO author (${fields.join(",")},created_date,created_userid,created_usertype) VALUES (${fields.map(() => "?").join(",")},NOW(6),?,1)`,
      [...fields.map((key) => data[key]), req.adminUser!.user_id],
    );
    if (!data.author_code)
      await connection.execute(
        "UPDATE author SET author_code=? WHERE author_id=?",
        [String(result.insertId).padStart(10, "0"), result.insertId],
      );
    await saveAffiliations(connection, result.insertId, resolved._affiliations);
    connection.afterCommit(() =>
      res.status(201).json({ id: result.insertId, message: "Author created." }),
    );
  });
});
authors.put("/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id),
    resolved = await resolveAffiliation(req.body);
  if (!resolved)
    return res.status(400).json({
      error:
        "The selected affiliation no longer exists. Please select another.",
    });
  const data = schema.parse(resolved);
  return transaction(async (connection) => {
    const [result] = await connection.execute(
      `UPDATE author SET ${fields.map((key) => key + "=?").join(",")},updated_date=NOW(6),updated_userid=?,updated_usertype=1 WHERE author_id=?`,
      [...fields.map((key) => data[key]), req.adminUser!.user_id, id],
    );
    if (!result.affectedRows) {
      return res.status(404).json({ error: "Author not found." });
    }
    await saveAffiliations(connection, id, resolved._affiliations);
    connection.afterCommit(() => res.json({ message: "Author updated." }));
  });
});
authors.delete("/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  return transaction(async (connection) => {
    const [rows] = await connection.execute(
      "SELECT author_id FROM author WHERE author_id=? FOR UPDATE",
      [id],
    );
    if (!rows.length) {
      return res.status(404).json({ error: "Author not found." });
    }
    const [articles] = await connection.execute(
      "SELECT author_ids FROM article FOR SHARE",
    );
    if (
      articles.some((article) => authorIds(article.author_ids).includes(id))
    ) {
      return res.status(409).json({
        error:
          "This author is linked to an article. Remove or reassign the article’s author reference before deleting this author.",
      });
    }
    await connection.execute("DELETE FROM author WHERE author_id=?", [id]);
    connection.afterCommit(() => res.json({ message: "Author deleted." }));
  });
});
