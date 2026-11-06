import { Router } from "express";
import { z } from "zod";
import path from "node:path";
import { unlink } from "node:fs/promises";
import { query } from "./db";
import { safeUrl } from "./content";
import { joinUsConfig } from "../src/pages/admin/join-us/join-us-config";
import { onlinePapersConfig } from "../src/pages/admin/online-papers/online-papers-config";
import { downloadsConfig } from "../src/pages/admin/downloads/downloads-config";
import { testimonialConfig } from "../src/pages/admin/testimonial/testimonial-config";
import { contactUsConfig } from "../src/pages/admin/contact-us/contact-us-config";
import type { ContentConfig } from "../src/components/admin/content-types";
import {
  reviewerCvPrefix,
  reviewerCvPattern,
  reviewerCvDirectory,
} from "./reviewer-application";
import {
  parseContentUpload,
  saveContentUpload,
  unlinkContentFile,
  ContentUploadError,
  contentDirectory,
  contentPrefix,
  contentFilePattern,
} from "./admin-content-upload";
const definitions = [
  { config: joinUsConfig, table: "joinus", audit: true },
  { config: onlinePapersConfig, table: "article_submission", audit: true },
  { config: downloadsConfig, table: "downloads", audit: false },
  { config: testimonialConfig, table: "testimonial", audit: false },
  { config: contactUsConfig, table: "contactus", audit: false },
];
export const adminContent = Router(),
  adminContentFiles = Router();
const idSchema = z.coerce.number().int().positive().max(2147483647);
export function contentSchema(config: ContentConfig) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of config.fields) {
    let value = z
      .string()
      .trim()
      .max(field.max || 255);
    if (field.required) value = value.min(2);
    shape[field.key] =
      field.type === "email"
        ? field.required
          ? z.email().max(255)
          : z.union([z.email().max(255), z.literal("")]).default("")
        : field.required
          ? value
          : value.default("");
  }
  if (config.status)
    shape.status = z.union([z.literal(0), z.literal(1), z.null()]);
  if (config.fileField)
    shape[config.fileField] = z.string().max(2000).default("");
  return z.object(shape);
}
async function cleanup(value: string | undefined) {
  const reviewerFile =
    value?.startsWith(reviewerCvPrefix) &&
    reviewerCvPattern.test(value.slice(reviewerCvPrefix.length));
  if (!value?.startsWith(contentPrefix) && !reviewerFile) return;
  try {
    for (const { config, table } of definitions) {
      if (config.fileField) {
        const rows = await query(
          `SELECT COUNT(*) total FROM ${table} WHERE ${config.fileField}=?`,
          [value],
        );
        if (rows[0].total) return;
      }
    }
    if (reviewerFile)
      await unlink(
        path.join(reviewerCvDirectory, value!.slice(reviewerCvPrefix.length)),
      ).catch(() => {});
    else await unlinkContentFile(value);
  } catch {
    /* Retain files when references cannot be checked. */
  }
}
adminContentFiles.get("/:filename", (req, res) => {
  const filename = req.params.filename;
  if (typeof filename !== "string" || !contentFilePattern.test(filename))
    return res.sendStatus(404);
  res.set({
    "Content-Type": filename.endsWith(".pdf")
      ? "application/pdf"
      : "image/webp",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  res.sendFile(path.join(contentDirectory, filename), (error) => {
    if (error && !res.headersSent) res.sendStatus(404);
  });
});
for (const { config, table, audit } of definitions) {
  const router = Router(),
    schema = contentSchema(config),
    columns = config.fields
      .map((field) => field.key)
      .concat(
        config.status ? ["status"] : [],
        config.fileField ? [config.fileField] : [],
      );
  router.get("/", async (req, res) => {
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
        "(" +
          config.search
            .map((key) => `${key} LIKE ? ESCAPE '!'`)
            .concat(`CAST(${config.id} AS CHAR)=?`)
            .join(" OR ") +
          ")",
      );
      params.push(...config.search.map(() => term), q);
    }
    if (config.status && status !== undefined) {
      clauses.push("status=?");
      params.push(Number(status));
    }
    const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
    const [records, count] = await Promise.all([
      query(
        `SELECT * FROM ${table} ${where} ORDER BY ${config.id} DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        params,
      ),
      query(`SELECT COUNT(*) total FROM ${table} ${where}`, params),
    ]);
    res.json({ records, total: count[0].total, page, limit });
  });
  router.get("/:id", async (req, res) => {
    const rows = await query(`SELECT * FROM ${table} WHERE ${config.id}=?`, [
      idSchema.parse(req.params.id),
    ]);
    if (!rows.length)
      return res.status(404).json({ error: "Record not found." });
    res.json({ record: rows[0] });
  });
  router.get("/:id/attachment", async (req, res) => {
    if (!config.fileField) return res.sendStatus(404);
    const rows = await query(
      `SELECT ${config.fileField} file FROM ${table} WHERE ${config.id}=?`,
      [idSchema.parse(req.params.id)],
    );
    const value = rows[0]?.file;
    if (!value) return res.sendStatus(404);
    let target: string | undefined;
    if (
      config.key === "join-us" &&
      value.startsWith(reviewerCvPrefix) &&
      reviewerCvPattern.test(value.slice(reviewerCvPrefix.length))
    )
      target = path.join(
        reviewerCvDirectory,
        value.slice(reviewerCvPrefix.length),
      );
    if (
      value.startsWith(contentPrefix) &&
      contentFilePattern.test(value.slice(contentPrefix.length))
    )
      target = path.join(contentDirectory, value.slice(contentPrefix.length));
    else if (
      config.key === "online-papers" &&
      /^[a-f0-9-]{36}\.pdf$/.test(value)
    )
      target = path.join(process.cwd(), "uploads", value);
    if (!target) return res.sendStatus(404);
    res.set({
      "Content-Type": target.endsWith(".webp")
        ? "image/webp"
        : target.endsWith(".docx")
          ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          : target.endsWith(".doc")
            ? "application/msword"
            : "application/pdf",
      ...(target.endsWith(".docx") || target.endsWith(".doc")
        ? {
            "Content-Disposition": `attachment; filename="${path.basename(target)}"`,
          }
        : {}),
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    });
    res.sendFile(target, (error) => {
      if (error && !res.headersSent) res.sendStatus(404);
    });
  });
  async function save(req, res) {
    const id = req.params.id ? idSchema.parse(req.params.id) : null;
    if (!id && !config.create)
      return res.status(405).json({
        error: "This section receives submissions through the public website.",
      });
    const original = id
      ? (await query(`SELECT * FROM ${table} WHERE ${config.id}=?`, [id]))[0]
      : null;
    if (id && !original)
      return res.status(404).json({ error: "Record not found." });
    const data = schema.parse(req.body) as Record<string, any>;
    if (config.fileField) {
      if (!Object.hasOwn(req.body, config.fileField))
        data[config.fileField] = original?.[config.fileField] || "";
      const file = data[config.fileField];
      if (file && file !== original?.[config.fileField] && !safeUrl(file))
        return res
          .status(400)
          .json({ error: "Upload a file or enter an HTTP/HTTPS file URL." });
      if (config.key === "downloads" && !file && !req.file)
        return res
          .status(400)
          .json({ error: "Upload a PDF or enter a download URL." });
    }
    let uploaded: string | undefined;
    try {
      uploaded = await saveContentUpload(req.file, config.fileType);
      if (uploaded && config.fileField) data[config.fileField] = uploaded;
      const keys = [...columns],
        values = columns.map((key) => data[key]);
      if (id) {
        const updated = table === "contactus" ? "update_date" : "updated_date";
        keys.push(updated);
        values.push(new Date());
        if (table !== "contactus") {
          keys.push("updated_userid");
          values.push(req.adminUser.user_id);
          if (audit) {
            keys.push("updated_usertype");
            values.push(1);
          }
        }
        const result = await query(
          `UPDATE ${table} SET ${keys.map((key) => `${key}=?`).join(",")} WHERE ${config.id}=?`,
          [...values, id],
        );
        if (!result.affectedRows) {
          await cleanup(uploaded);
          return res.status(404).json({ error: "Record not found." });
        }
        if (
          config.fileField &&
          data[config.fileField] !== original?.[config.fileField]
        )
          await cleanup(original?.[config.fileField]);
        res.json({ id, message: "Record updated." });
      } else {
        keys.push("created_date", "created_userid");
        values.push(new Date(), req.adminUser.user_id);
        const result = await query(
          `INSERT INTO ${table} (${keys.join(",")}) VALUES (${keys.map(() => "?").join(",")})`,
          values,
        );
        res
          .status(201)
          .json({ id: result.insertId, message: "Record created." });
      }
    } catch (error) {
      await cleanup(uploaded);
      if (error instanceof ContentUploadError)
        return res.status(400).json({ error: error.message });
      throw error;
    }
  }
  router.post("/", parseContentUpload, save);
  router.put("/:id", parseContentUpload, save);
  router.delete("/:id", async (req, res) => {
    const id = idSchema.parse(req.params.id),
      original = (
        await query(`SELECT * FROM ${table} WHERE ${config.id}=?`, [id])
      )[0];
    const result = await query(`DELETE FROM ${table} WHERE ${config.id}=?`, [
      id,
    ]);
    if (!result.affectedRows)
      return res.status(404).json({ error: "Record not found." });
    if (config.fileField) await cleanup(original?.[config.fileField]);
    res.json({ message: "Record deleted." });
  });
  adminContent.use("/" + config.key, router);
}
