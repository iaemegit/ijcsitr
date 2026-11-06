import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { query } from "./db";
import { validArticlePdf } from "./article-upload";
import { validWord } from "./article-documents";
import { countries } from "../src/data/countries";
export const reviewerCvDirectory = path.join(
  process.cwd(),
  "uploads/reviewer-applications",
);
export const reviewerCvPrefix = "/private/reviewer-applications/";
export const reviewerCvPattern = /^[a-f0-9-]{36}\.(pdf|doc|docx)$/;
const text = (max = 255) => z.string().trim().max(max).default("");
const countryNames = new Set(countries.map((c) => c.name));
export const reviewerApplicationSchema = z.object({
  prefix: z.enum(["Mr", "Ms", "Mrs", "Dr", "Prof"]),
  name: z.string().trim().min(2).max(255),
  email_id: z.email().max(255),
  mobile_number: z.string().trim().min(5).max(20),
  affiliation: text(),
  qualification: z.string().trim().min(2).max(5000),
  discipline: z.string().trim().min(2).max(255),
  researcharea: text(5000),
  country: z
    .string()
    .refine((value) => countryNames.has(value), "Select a country."),
  state: z.string().trim().min(2).max(255),
  city: z.string().trim().min(2).max(255),
  message: text(10000),
});
export const reviewerApplications = Router();
reviewerApplications.get("/options", async (_req, res) => {
  res.json({
    disciplines: await query(
      "SELECT discipline_id,discipline_name FROM discipline WHERE status=1 ORDER BY discipline_name",
    ),
  });
});
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 12,
    fieldSize: 12000,
  },
}).single("resume");
reviewerApplications.post(
  "/",
  (req, res, next) =>
    upload(req, res, (error) =>
      error
        ? res
            .status(400)
            .json({
              error: "Attach one PDF, DOC or DOCX file, no larger than 10 MB.",
            })
        : next(),
    ),
  async (req, res) => {
    const data = reviewerApplicationSchema.parse(req.body);
    if (!req.file || !(validArticlePdf(req.file) || validWord(req.file)))
      return res
        .status(400)
        .json({
          error: "Attach a valid PDF, DOC or DOCX resume (up to 10 MB).",
        });
    const disciplines = await query(
      "SELECT discipline_id FROM discipline WHERE discipline_name=? AND status=1 LIMIT 1",
      [data.discipline],
    );
    if (!disciplines.length)
      return res.status(400).json({ error: "Select an available discipline." });
    const filename =
      randomUUID() + path.extname(req.file.originalname).toLowerCase();
    const target = path.join(reviewerCvDirectory, filename);
    await mkdir(reviewerCvDirectory, { recursive: true });
    try {
      await writeFile(target, req.file.buffer);
      const result = await query(
        "INSERT INTO joinus (prefix,name,email_id,mobile_number,affiliation,qualifiaction,discipline,researcharea,country,state,city,message,resume_cv,status,created_date) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,0,NOW(6))",
        [
          data.prefix,
          data.name,
          data.email_id,
          data.mobile_number,
          data.affiliation,
          data.qualification,
          data.discipline,
          data.researcharea,
          data.country,
          data.state,
          data.city,
          data.message,
          reviewerCvPrefix + filename,
        ],
      );
      res
        .status(201)
        .json({
          id: result.insertId,
          message: "Your application has been received.",
        });
    } catch (error) {
      await unlink(target).catch(() => {});
      throw error;
    }
  },
);
