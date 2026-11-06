import { Router } from "express";
import { z } from "zod";
import { query, serializeDatabase } from "./db";
import { prisma } from "../src/lib/prisma";
import multer from "multer";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { journalHtml } from "./journal-content";
const coverDirectory = process.cwd() + "/uploads/journal-covers/";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 256 * 1024,
  },
}).single("cover_image");
function parseUpload(req, res, next) {
  upload(req, res, (error) =>
    error
      ? res
          .status(400)
          .json({
            error:
              error.code === "LIMIT_FILE_SIZE"
                ? "The cover image must be 5 MB or smaller."
                : "The cover upload could not be accepted.",
          })
      : next(),
  );
}
export const journal = Router();
const text = z.string().trim().max(255).nullable().default(null);
const schema = z.object({
  journal_name: z.string().trim().min(2).max(255),
  journal_key: z.string().trim().min(1).max(255),
  abbrevation: text,
  coden: text,
  cover_page: text,
  discipline_id: z.number().int().positive().max(2147483647).nullable(),
  doi: text,
  email: z.union([z.email().max(255), z.literal(""), z.null()]).default(null),
  google_scholar: text,
  issn_online: text,
  issn_print: text,
  publication_frequency: z.string().trim().min(1).max(255),
  start_month: z.string().trim().min(1).max(255),
  start_year: z.string().regex(/^\d{4}$/, "Enter a four-digit year."),
  status: z.union([z.literal(0), z.literal(1), z.null()]),
  sub_price: text,
  about_us: z.string().max(20000).nullable().default(null),
  subject_area: z.string().max(20000).nullable().default(null),
});
const fields = Object.keys(schema.shape);
export async function currentJournal() {
  if (process.env.JOURNAL_ID) {
    const id = z.coerce.number().int().positive().parse(process.env.JOURNAL_ID);
    return serializeDatabase(
      await prisma.journal.findUnique({ where: { journal_id: BigInt(id) } }),
    );
  }
  return serializeDatabase(
    await prisma.journal.findFirst({ orderBy: { journal_id: "asc" } }),
  );
}
journal.get("/", async (req, res) => {
  const [row, disciplines] = await Promise.all([
    currentJournal(),
    query(
      "SELECT discipline_id,discipline_name,status FROM discipline ORDER BY discipline_name",
    ),
  ]);
  if (!row) return res.status(404).json({ error: "Journal not found." });
  res.json({ journal: row, disciplines });
});
journal.put("/", parseUpload, async (req, res) => {
  let body = req.body;
  if (req.is("multipart/form-data")) {
    try {
      body = JSON.parse(req.body.data);
    } catch {
      return res.status(400).json({ error: "Invalid journal form data." });
    }
  }
  const data = schema.parse(body),
    row = await currentJournal();
  if (!row) return res.status(404).json({ error: "Journal not found." });
  if (
    data.discipline_id &&
    !(
      await query(
        "SELECT discipline_id FROM discipline WHERE discipline_id=?",
        [data.discipline_id],
      )
    ).length
  )
    return res.status(400).json({
      error:
        "The selected discipline no longer exists. Refresh and select another.",
    });
  data.about_us = journalHtml(data.about_us);
  data.subject_area = journalHtml(data.subject_area);
  let coverPath;
  if (req.file) {
    let image;
    try {
      const pipeline = sharp(req.file.buffer, {
        limitInputPixels: 25000000,
        animated: false,
      });
      const metadata = await pipeline.metadata();
      if (!["jpeg", "png", "webp"].includes(metadata.format))
        throw new Error("format");
      image = await pipeline
        .rotate()
        .resize({
          width: 1600,
          height: 1600,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
    } catch {
      return res
        .status(400)
        .json({ error: "Choose a valid JPEG, PNG or WebP cover image." });
    }
    const filename = randomUUID() + ".webp";
    await mkdir(coverDirectory, { recursive: true });
    coverPath = coverDirectory + filename;
    await writeFile(coverPath, image);
    data.cover_page = "/media/journal-covers/" + filename;
  }
  try {
    const result = await query(
      `UPDATE journal SET ${fields.map((field) => field + "=?").join(",")},updated_date=NOW(6),updated_userid=?,updated_usertype=1 WHERE journal_id=?`,
      [
        ...fields.map((field) => data[field]),
        req.adminUser!.user_id,
        row.journal_id,
      ],
    );
    if (!result.affectedRows) {
      if (coverPath) await unlink(coverPath).catch(() => {});
      return res.status(404).json({ error: "Journal not found." });
    }
    res.json({ message: "Journal updated successfully." });
  } catch (error) {
    if (coverPath) await unlink(coverPath).catch(() => {});
    throw error;
  }
});
journal.all("/", (req, res) =>
  res.set("Allow", "GET, HEAD, PUT").status(405).json({
    error:
      "This is a single-journal application. Only viewing and editing the existing journal are supported.",
  }),
);
