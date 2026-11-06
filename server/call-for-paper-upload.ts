import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { query } from "./db";
export const callFileDirectory = path.join(
  process.cwd(),
  "uploads/call-for-papers",
);
export const callFilePrefix = "/api/admin/calls-for-papers/files/";
export const callFilePattern = /^[a-f0-9-]{36}\.pdf$/;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 32 * 1024,
  },
}).single("call_pdf");
export function parseCallUpload(req, res, next) {
  upload(req, res, (error) => {
    if (error)
      return res
        .status(400)
        .json({
          error:
            error.code === "LIMIT_FILE_SIZE"
              ? "The PDF must be 10 MB or smaller."
              : "The PDF upload could not be accepted.",
        });
    if (req.is("multipart/form-data")) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch {
        return res.status(400).json({ error: "Invalid call for papers data." });
      }
    }
    next();
  });
}
export class CallUploadError extends Error {}
export async function saveCallPdf(file?: Express.Multer.File) {
  if (!file) return undefined;
  if (
    file.mimetype !== "application/pdf" ||
    path.extname(file.originalname).toLowerCase() !== ".pdf" ||
    file.buffer.subarray(0, 5).toString() !== "%PDF-"
  )
    throw new CallUploadError("Choose a valid PDF file.");
  await mkdir(callFileDirectory, { recursive: true });
  const filename = randomUUID() + ".pdf",
    target = path.join(callFileDirectory, filename);
  try {
    await writeFile(target, file.buffer);
  } catch (error) {
    await unlink(target).catch(() => {});
    throw error;
  }
  return callFilePrefix + filename;
}
export async function removeUnusedCallPdf(value?: string | null) {
  if (!value?.startsWith(callFilePrefix)) return;
  const filename = value.slice(callFilePrefix.length);
  if (!callFilePattern.test(filename)) return;
  try {
    const rows = await query(
      "SELECT COUNT(*) total FROM callforpaper WHERE file=?",
      [value],
    );
    if (!rows[0].total)
      await unlink(path.join(callFileDirectory, filename)).catch(() => {});
  } catch {
    /* Preserve files when reference checks fail. */
  }
}
