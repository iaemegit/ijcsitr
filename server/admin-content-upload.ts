import multer from "multer";
import sharp from "sharp";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
export const contentDirectory = path.join(
  process.cwd(),
  "uploads/admin-content",
);
export const contentPrefix = "/api/admin/content-files/";
export const contentFilePattern = /^[a-f0-9-]{36}\.(pdf|webp)$/;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 32 * 1024,
  },
}).single("attachment");
export function parseContentUpload(req, res, next) {
  upload(req, res, (error) => {
    if (error)
      return res
        .status(400)
        .json({ error: "Upload a PDF up to 10 MB or an image up to 5 MB." });
    if (req.is("multipart/form-data")) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch {
        return res.status(400).json({ error: "Invalid form data." });
      }
    }
    next();
  });
}
export class ContentUploadError extends Error {}
export async function saveContentUpload(
  file: Express.Multer.File | undefined,
  type: "pdf" | "image" | undefined,
) {
  if (!file) return undefined;
  let buffer: Buffer, extension: string;
  if (type === "pdf") {
    if (
      file.mimetype !== "application/pdf" ||
      path.extname(file.originalname).toLowerCase() !== ".pdf" ||
      file.buffer.subarray(0, 5).toString() !== "%PDF-"
    )
      throw new ContentUploadError("Choose a valid PDF file.");
    buffer = file.buffer;
    extension = "pdf";
  } else if (type === "image") {
    if (file.size > 5 * 1024 * 1024)
      throw new ContentUploadError("The image must be 5 MB or smaller.");
    try {
      const image = sharp(file.buffer, {
          limitInputPixels: 25000000,
          animated: false,
        }),
        meta = await image.metadata();
      if (
        !["jpeg", "png", "webp"].includes(meta.format || "") ||
        !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
      )
        throw new Error("format");
      buffer = await image
        .rotate()
        .resize({
          width: 1200,
          height: 1200,
          fit: "inside",
          withoutEnlargement: true,
        })
        .webp({ quality: 85 })
        .toBuffer();
      extension = "webp";
    } catch {
      throw new ContentUploadError("Choose a valid JPG, PNG or WebP image.");
    }
  } else throw new ContentUploadError("This form does not accept uploads.");
  await mkdir(contentDirectory, { recursive: true });
  const filename = randomUUID() + "." + extension,
    target = path.join(contentDirectory, filename);
  try {
    await writeFile(target, buffer);
  } catch (error) {
    await unlink(target).catch(() => {});
    throw error;
  }
  return contentPrefix + filename;
}
export async function unlinkContentFile(value: string | undefined) {
  if (!value?.startsWith(contentPrefix)) return;
  const filename = value.slice(contentPrefix.length);
  if (contentFilePattern.test(filename))
    await unlink(path.join(contentDirectory, filename)).catch(() => {});
}
