import { Router } from "express";
import { z } from "zod";
import { query, serializeDatabase } from "./db";
import { prisma } from "../src/lib/prisma";
import { safeUrl } from "./content";
import { affiliationAuthors } from "./affiliation-links";
import path from "node:path";
import {
  parseAffiliationUpload,
  saveAffiliationLogo,
  removeUnusedAffiliationLogo,
  AffiliationLogoError,
  affiliationLogoDirectory,
  affiliationLogoPattern,
} from "./affiliation-upload";
export const affiliations = Router();
const idSchema = z.coerce
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);
const optionalText = z.string().trim().max(255).default("");
const schema = z.object({
  aff_name: optionalText,
  aff_code: optionalText,
  alternate_name: optionalText,
  address: optionalText,
  country: z.string().trim().min(2).max(255),
  website: optionalText.refine(
    (value) => !value || safeUrl(value) !== null,
    "Enter a valid HTTP or HTTPS website URL.",
  ),
  logo: optionalText,
  papers_published: z.number().int().min(0).max(2147483647).optional(),
  status: z.union([z.literal(0), z.literal(1)]),
});
const fields = [
  "aff_name",
  "aff_code",
  "alternate_name",
  "address",
  "country",
  "website",
  "logo",
  "papers_published",
  "status",
];
affiliations.get("/", async (req, res) => {
  const { q, page, limit } = z
    .object({
      q: z.string().trim().max(200).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
    })
    .parse(req.query);
  const term = "%" + q.replace(/[!%_]/g, (value) => "!" + value) + "%";
  const where = q
    ? "WHERE aff_name LIKE ? ESCAPE '!' OR aff_code LIKE ? ESCAPE '!' OR alternate_name LIKE ? ESCAPE '!' OR country LIKE ? ESCAPE '!' OR address LIKE ? ESCAPE '!' OR CAST(aff_id AS CHAR) LIKE ? ESCAPE '!'"
    : "";
  const params = q ? Array(6).fill(term) : [];
  const exactId = /^[1-9]\d*$/.test(q) && Number.isSafeInteger(Number(q));
  const order = exactId
    ? "ORDER BY (aff_id=?) DESC,aff_id DESC"
    : "ORDER BY aff_id DESC";
  const [rows, count] = await Promise.all([
    query(
      `SELECT affiliation.*, (SELECT COUNT(*) FROM author a WHERE a.affiliation_id=affiliation.aff_id OR EXISTS (SELECT 1 FROM author_affiliation aa WHERE aa.author_id=a.author_id AND aa.affiliation_id=affiliation.aff_id)) AS author_count FROM affiliation ${where} ${order} LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      exactId ? [...params, Number(q)] : params,
    ),
    query(`SELECT COUNT(*) total FROM affiliation ${where}`, params),
  ]);
  res.json({ affiliations: rows, total: count[0].total, page, limit });
});
affiliations.get("/logos/:filename", async (req, res) => {
  const filename = req.params.filename;
  if (typeof filename !== "string" || !affiliationLogoPattern.test(filename))
    return res.sendStatus(404);
  res.set({
    "Content-Type": "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  res.sendFile(path.join(affiliationLogoDirectory, filename), (error) => {
    if (error && !res.headersSent) res.sendStatus(404);
  });
});
affiliations.get("/:id/links", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const row = await prisma.affiliation.findUnique({
    where: { aff_id: BigInt(id) },
    select: { aff_id: true, aff_name: true },
  });
  if (!row) return res.status(404).json({ error: "Affiliation not found." });
  const authors = await affiliationAuthors(id);
  res.json({
    affiliation: serializeDatabase(row),
    authors,
    can_delete: authors.length === 0,
  });
});
affiliations.get("/:id", async (req, res) => {
  const row = await prisma.affiliation.findUnique({
    where: { aff_id: BigInt(idSchema.parse(req.params.id)) },
  });
  if (!row) return res.status(404).json({ error: "Affiliation not found." });
  res.json({ affiliation: serializeDatabase(row) });
});
affiliations.post("/", parseAffiliationUpload, async (req, res) => {
  const data = schema.parse(req.body);
  let uploaded: string | undefined;
  try {
    uploaded = await saveAffiliationLogo(req.file);
    const result = await prisma.affiliation.create({
      data: {
        ...data,
        papers_published: data.papers_published ?? 0,
        logo: uploaded || data.logo,
        created_date: new Date(),
        created_userid: req.adminUser!.user_id,
        created_usertype: 1,
      },
    });
    res.status(201).json({
      id: serializeDatabase(result.aff_id),
      message: "Affiliation created.",
    });
  } catch (error) {
    await removeUnusedAffiliationLogo(uploaded);
    if (error instanceof AffiliationLogoError)
      return res.status(400).json({ error: error.message });
    throw error;
  }
});
affiliations.put("/:id", parseAffiliationUpload, async (req, res) => {
  const id = idSchema.parse(req.params.id),
    data = schema.parse(req.body);
  const original = await prisma.affiliation.findUnique({
    where: { aff_id: BigInt(id) },
    select: { logo: true },
  });
  if (!original)
    return res.status(404).json({ error: "Affiliation not found." });
  let uploaded: string | undefined;
  try {
    uploaded = await saveAffiliationLogo(req.file);
    const result = await prisma.affiliation.updateMany({
      where: { aff_id: BigInt(id) },
      data: {
        ...data,
        logo:
          uploaded ||
          (Object.hasOwn(req.body, "logo") ? data.logo : original.logo),
        updated_date: new Date(),
        updated_userid: req.adminUser!.user_id,
        updated_usertype: 1,
      },
    });
    if (!result.count) {
      await removeUnusedAffiliationLogo(uploaded);
      return res.status(404).json({ error: "Affiliation not found." });
    }
    if (uploaded || data.logo !== original.logo)
      await removeUnusedAffiliationLogo(original.logo);
    res.json({ message: "Affiliation updated." });
  } catch (error) {
    await removeUnusedAffiliationLogo(uploaded);
    if (error instanceof AffiliationLogoError)
      return res.status(400).json({ error: error.message });
    throw error;
  }
});
affiliations.delete("/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id);
  const authors = await affiliationAuthors(id);
  if (authors.length)
    return res.status(409).json({
      error: "This affiliation is linked to authors and cannot be deleted.",
      authors,
      can_delete: false,
    });
  try {
    const original = await prisma.affiliation.findUnique({
      where: { aff_id: BigInt(id) },
      select: { logo: true },
    });
    const result = await prisma.affiliation.deleteMany({
      where: { aff_id: BigInt(id) },
    });
    if (!result.count)
      return res.status(404).json({ error: "Affiliation not found." });
    await removeUnusedAffiliationLogo(original?.logo);
    res.json({ message: "Affiliation deleted." });
  } catch (error) {
    if (error.code === "ER_ROW_IS_REFERENCED_2" || error.code === "P2003")
      return res.status(409).json({
        authors: await affiliationAuthors(id),
        can_delete: false,
        error:
          "This affiliation is assigned to an author. Remove it from the author’s selected affiliations before deleting it.",
      });
    throw error;
  }
});
