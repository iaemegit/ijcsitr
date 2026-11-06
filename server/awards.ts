import { Router } from "express";
import { z } from "zod";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { query, serializeDatabase } from "./db";
import { safeUrl } from "./content";
import { awardSchema, awardUrlFields } from "./awards-schema";
import {
  parseAwardPhoto,
  saveAwardPhoto,
  removeUnusedAwardPhoto,
  AwardPhotoError,
  awardPhotoDirectory,
  awardPhotoPattern,
} from "./awards-upload";
export const awards = Router();
const idSchema = z.coerce.number().int().positive().max(2147483647);
awards.get("/", async (req, res) => {
  const { q, page, limit, status } = z
    .object({
      q: z.string().trim().max(200).default(""),
      page: z.coerce.number().int().min(1).max(100000).default(1),
      limit: z.coerce.number().int().min(1).max(50).default(10),
      status: z.enum(["0", "1"]).optional(),
    })
    .parse(req.query);
  const clauses: string[] = [],
    params: unknown[] = [];
  if (q) {
    const term = "%" + q.replace(/[!%_]/g, (c) => "!" + c) + "%";
    clauses.push(
      "(name LIKE ? ESCAPE '!' OR affiliation LIKE ? ESCAPE '!' OR award_type LIKE ? ESCAPE '!' OR email LIKE ? ESCAPE '!' OR CAST(id AS CHAR)=?)",
    );
    params.push(term, term, term, term, q);
  }
  if (status !== undefined) {
    clauses.push("status=?");
    params.push(Number(status));
  }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const [members, count] = await Promise.all([
    query(
      `SELECT * FROM awards ${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    ),
    query(`SELECT COUNT(*) total FROM awards ${where}`, params),
  ]);
  res.json({ members, total: count[0].total, page, limit });
});
awards.get("/photos/:filename", (req, res) => {
  const filename = req.params.filename;
  if (typeof filename !== "string" || !awardPhotoPattern.test(filename))
    return res.sendStatus(404);
  res.set({
    "Content-Type": "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  res.sendFile(path.join(awardPhotoDirectory, filename), (error) => {
    if (error && !res.headersSent) res.sendStatus(404);
  });
});
awards.get("/:id", async (req, res) => {
  const member = await prisma.awards.findUnique({
    where: { id: idSchema.parse(req.params.id) },
  });
  if (!member) return res.status(404).json({ error: "Award not found." });
  res.json({ member: serializeDatabase(member) });
});
async function save(req, res) {
  const id = req.params.id ? idSchema.parse(req.params.id) : null,
    original = id
      ? await prisma.awards.findUnique({ where: { id: id } })
      : null;
  if (id && !original)
    return res.status(404).json({ error: "Award not found." });
  const data = awardSchema.parse(req.body);
  for (const field of awardUrlFields)
    if (
      data[field] &&
      data[field] !== original?.[field] &&
      !safeUrl(data[field])
    )
      return res.status(400).json({
        error: "Enter valid HTTP or HTTPS profile URLs.",
        fields: { [field]: ["Enter an HTTP or HTTPS URL."] },
      });
  if (original && !Object.hasOwn(req.body, "profile_photo"))
    data.profile_photo = original.profile_photo || "";
  let uploaded: string | undefined;
  try {
    uploaded = await saveAwardPhoto(req.file);
    if (uploaded) data.profile_photo = uploaded;
    if (id) {
      const result = await prisma.awards.updateMany({
        where: { id: id },
        data: {
          ...data,
          updated_date: new Date(),
          updated_userid: req.adminUser.user_id,
          updated_usertype: 1,
        },
      });
      if (!result.count) {
        await removeUnusedAwardPhoto(uploaded);
        return res.status(404).json({ error: "Award not found." });
      }
      if (uploaded) await removeUnusedAwardPhoto(original?.profile_photo);
      return res.json({ id, message: "Award updated." });
    }
    const member = await prisma.awards.create({
      data: {
        ...data,
        created_date: new Date(),
        created_userid: req.adminUser.user_id,
        created_usertype: 1,
      },
    });
    res.status(201).json({ id: member.id, message: "Award created." });
  } catch (error) {
    await removeUnusedAwardPhoto(uploaded);
    if (error instanceof AwardPhotoError)
      return res.status(400).json({ error: error.message });
    throw error;
  }
}
awards.post("/", parseAwardPhoto, save);
awards.put("/:id", parseAwardPhoto, save);
awards.delete("/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id),
    original = await prisma.awards.findUnique({
      where: { id: id },
      select: { profile_photo: true },
    });
  const result = await prisma.awards.deleteMany({
    where: { id: id },
  });
  if (!result.count) return res.status(404).json({ error: "Award not found." });
  await removeUnusedAwardPhoto(original?.profile_photo);
  res.json({ message: "Award deleted." });
});
