import { Router } from "express";
import { z } from "zod";
import path from "node:path";
import { prisma } from "../src/lib/prisma";
import { query, serializeDatabase } from "./db";
import { safeUrl } from "./content";
import { callForPaperSchema } from "./call-for-paper-schema";
import {
  parseCallUpload,
  saveCallPdf,
  removeUnusedCallPdf,
  CallUploadError,
  callFileDirectory,
  callFilePrefix,
  callFilePattern,
} from "./call-for-paper-upload";
export const callsForPapers = Router();
const idSchema = z.coerce.number().int().positive().max(2147483647);
callsForPapers.get("/", async (req, res) => {
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
      "(issue_month LIKE ? ESCAPE '!' OR issue_year LIKE ? ESCAPE '!' OR dispatch_month LIKE ? ESCAPE '!' OR dispatch_year LIKE ? ESCAPE '!' OR CAST(deadline AS CHAR) LIKE ? ESCAPE '!' OR CAST(call_id AS CHAR)=?)",
    );
    params.push(term, term, term, term, term, q);
  }
  if (status !== undefined) {
    clauses.push("status=?");
    params.push(Number(status));
  }
  const where = clauses.length ? "WHERE " + clauses.join(" AND ") : "";
  const [calls, count] = await Promise.all([
    query(
      `SELECT * FROM callforpaper ${where} ORDER BY call_id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
      params,
    ),
    query(`SELECT COUNT(*) total FROM callforpaper ${where}`, params),
  ]);
  res.json({ calls, total: count[0].total, page, limit });
});
callsForPapers.get("/files/:filename", (req, res) => {
  const filename = req.params.filename;
  if (typeof filename !== "string" || !callFilePattern.test(filename))
    return res.sendStatus(404);
  res.set({
    "Content-Type": "application/pdf",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store",
  });
  res.sendFile(path.join(callFileDirectory, filename), (error) => {
    if (error && !res.headersSent) res.sendStatus(404);
  });
});
callsForPapers.get("/:id", async (req, res) => {
  const call = await prisma.callforpaper.findUnique({
    where: { call_id: idSchema.parse(req.params.id) },
  });
  if (!call)
    return res.status(404).json({ error: "Call for papers not found." });
  res.json({ call: serializeDatabase(call) });
});
async function save(req, res) {
  const id = req.params.id ? idSchema.parse(req.params.id) : null,
    original = id
      ? await prisma.callforpaper.findUnique({ where: { call_id: id } })
      : null;
  if (id && !original)
    return res.status(404).json({ error: "Call for papers not found." });
  const data = callForPaperSchema.parse(req.body);
  if (!Object.hasOwn(req.body, "file")) data.file = original?.file || "";
  if (data.file && data.file !== original?.file && !safeUrl(data.file))
    return res
      .status(400)
      .json({ error: "Upload a PDF or provide a valid HTTP/HTTPS file URL." });
  let uploaded: string | undefined;
  try {
    uploaded = await saveCallPdf(req.file);
    const values = {
      ...data,
      file: uploaded || data.file,
      deadline: new Date(data.deadline + "T00:00:00Z"),
      dispatch_date: new Date(data.dispatch_date + "T00:00:00Z"),
    };
    if (id) {
      const result = await prisma.callforpaper.updateMany({
        where: { call_id: id },
        data: {
          ...values,
          updated_date: new Date(),
          updated_userid: req.adminUser.user_id,
          updated_usertype: 1,
        },
      });
      if (!result.count) {
        await removeUnusedCallPdf(uploaded);
        return res.status(404).json({ error: "Call for papers not found." });
      }
      if (values.file !== original?.file)
        await removeUnusedCallPdf(original?.file);
      return res.json({ id, message: "Call for papers updated." });
    }
    const call = await prisma.callforpaper.create({
      data: {
        ...values,
        created_date: new Date(),
        created_userid: req.adminUser.user_id,
        created_usertype: 1,
      },
    });
    res
      .status(201)
      .json({ id: call.call_id, message: "Call for papers created." });
  } catch (error) {
    await removeUnusedCallPdf(uploaded);
    if (error instanceof CallUploadError)
      return res.status(400).json({ error: error.message });
    throw error;
  }
}
callsForPapers.post("/", parseCallUpload, save);
callsForPapers.put("/:id", parseCallUpload, save);
callsForPapers.delete("/:id", async (req, res) => {
  const id = idSchema.parse(req.params.id),
    original = await prisma.callforpaper.findUnique({
      where: { call_id: id },
      select: { file: true },
    });
  const result = await prisma.callforpaper.deleteMany({
    where: { call_id: id },
  });
  if (!result.count)
    return res.status(404).json({ error: "Call for papers not found." });
  await removeUnusedCallPdf(original?.file);
  res.json({ message: "Call for papers deleted." });
});
