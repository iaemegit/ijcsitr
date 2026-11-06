import multer from "multer";
import sharp from "sharp";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { query } from "./db";
export const awardPhotoDirectory = path.join(process.cwd(), "uploads/awards");
export const awardPhotoPattern = /^[a-f0-9-]{36}\.webp$/;
export const awardPhotoPrefix = "/api/admin/awards/photos/";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 32 * 1024,
  },
}).single("profile_photo_file");
export function parseAwardPhoto(req, res, next) {
  upload(req, res, (error) => {
    if (error)
      return res.status(400).json({
        error:
          error.code === "LIMIT_FILE_SIZE"
            ? "The profile photo must be 5 MB or smaller."
            : "The profile photo upload could not be accepted.",
      });
    if (req.is("multipart/form-data")) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch {
        return res.status(400).json({ error: "Invalid award data." });
      }
    }
    next();
  });
}
export class AwardPhotoError extends Error {}
export async function saveAwardPhoto(file?: Express.Multer.File) {
  if (!file) return undefined;
  let buffer: Buffer;
  try {
    const image = sharp(file.buffer, {
        limitInputPixels: 25000000,
        animated: false,
      }),
      metadata = await image.metadata();
    if (
      !["jpeg", "png", "webp"].includes(metadata.format || "") ||
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
  } catch {
    throw new AwardPhotoError("Choose a valid JPG, PNG or WebP profile photo.");
  }
  await mkdir(awardPhotoDirectory, { recursive: true });
  const filename = randomUUID() + ".webp";
  const target = path.join(awardPhotoDirectory, filename);
  try {
    await writeFile(target, buffer);
  } catch (error) {
    await unlink(target).catch(() => {});
    throw error;
  }
  return awardPhotoPrefix + filename;
}
export async function removeUnusedAwardPhoto(value?: string | null) {
  if (!value?.startsWith(awardPhotoPrefix)) return;
  const filename = value.slice(awardPhotoPrefix.length);
  if (!awardPhotoPattern.test(filename)) return;
  try {
    const rows = await query(
      "SELECT COUNT(*) total FROM awards WHERE profile_photo=?",
      [value],
    );
    if (!rows[0].total)
      await unlink(path.join(awardPhotoDirectory, filename)).catch(() => {});
  } catch {
    /* Keep files if references cannot be checked. */
  }
}
