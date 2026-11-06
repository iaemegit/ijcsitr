import multer from "multer";
import sharp from "sharp";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
export const issueUploadDirectory = path.join(
  process.cwd(),
  "uploads/journal-issues",
);
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 2,
    fields: 1,
    fieldSize: 256 * 1024,
  },
}).fields([
  { name: "issue_file", maxCount: 1 },
  { name: "cover_file", maxCount: 1 },
]);
export function parseIssueUpload(req, res, next) {
  upload(req, res, (error) =>
    error
      ? res
          .status(400)
          .json({
            error:
              error.code === "LIMIT_FILE_SIZE"
                ? "The issue PDF must be 10 MB or smaller; the cover image must be 5 MB or smaller."
                : "The issue upload could not be accepted.",
          })
      : next(),
  );
}
export class IssueUploadError extends Error {}
type PreparedFile = {
  field: "file_path" | "cover_image";
  filename: string;
  buffer: Buffer;
};
export async function prepareIssueUploads(
  files: Record<string, Express.Multer.File[]> | undefined,
): Promise<PreparedFile[]> {
  const prepared: PreparedFile[] = [];
  const pdf = files?.issue_file?.[0];
  if (pdf) {
    if (
      pdf.mimetype !== "application/pdf" ||
      path.extname(pdf.originalname).toLowerCase() !== ".pdf" ||
      pdf.buffer.subarray(0, 5).toString() !== "%PDF-"
    )
      throw new IssueUploadError("Choose a valid PDF issue file.");
    prepared.push({
      field: "file_path",
      filename: randomUUID() + ".pdf",
      buffer: pdf.buffer,
    });
  }
  const cover = files?.cover_file?.[0];
  if (cover) {
    if (cover.size > 5 * 1024 * 1024)
      throw new IssueUploadError("The cover image must be 5 MB or smaller.");
    try {
      const image = sharp(cover.buffer, {
        limitInputPixels: 25000000,
        animated: false,
      });
      const metadata = await image.metadata();
      if (
        !["jpeg", "png"].includes(metadata.format || "") ||
        !["image/jpeg", "image/png"].includes(cover.mimetype)
      )
        throw new Error("format");
      prepared.push({
        field: "cover_image",
        filename: randomUUID() + ".webp",
        buffer: await image
          .rotate()
          .resize({
            width: 1600,
            height: 1600,
            fit: "inside",
            withoutEnlargement: true,
          })
          .webp({ quality: 85 })
          .toBuffer(),
      });
    } catch {
      throw new IssueUploadError("Choose a valid JPG or PNG cover image.");
    }
  }
  return prepared;
}
export async function writeIssueUploads(
  prepared: PreparedFile[],
  createdPaths: string[],
) {
  const values: Partial<Record<"file_path" | "cover_image", string>> = {};
  if (prepared.length) await mkdir(issueUploadDirectory, { recursive: true });
  for (const file of prepared) {
    const target = path.join(issueUploadDirectory, file.filename);
    createdPaths.push(target);
    await writeFile(target, file.buffer);
    values[file.field] = "/api/admin/journal-issues/files/" + file.filename;
  }
  return values;
}
