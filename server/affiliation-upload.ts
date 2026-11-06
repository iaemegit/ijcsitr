import multer from "multer";
import sharp from "sharp";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { query } from "./db";

export const affiliationLogoDirectory = path.join(
  process.cwd(),
  "uploads/affiliation-logos",
);
export const affiliationLogoPattern = /^[a-f0-9-]{36}\.webp$/;
const prefix = "/api/admin/affiliations/logos/";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 32 * 1024,
  },
}).single("logo_file");
export function parseAffiliationUpload(req, res, next) {
  upload(req, res, (error) => {
    if (error)
      return res
        .status(400)
        .json({
          error:
            error.code === "LIMIT_FILE_SIZE"
              ? "The logo must be 5 MB or smaller."
              : "The logo upload could not be accepted.",
        });
    if (req.is("multipart/form-data")) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch {
        return res.status(400).json({ error: "Invalid affiliation data." });
      }
    }
    next();
  });
}
export class AffiliationLogoError extends Error {}
export async function saveAffiliationLogo(file?: Express.Multer.File) {
  if (!file) return undefined;
  let buffer: Buffer;
  try {
    const image = sharp(file.buffer, {
      limitInputPixels: 25000000,
      animated: false,
    });
    const metadata = await image.metadata();
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
    throw new AffiliationLogoError("Choose a valid JPG, PNG or WebP logo.");
  }
  await mkdir(affiliationLogoDirectory, { recursive: true });
  const filename = randomUUID() + ".webp";
  await writeFile(path.join(affiliationLogoDirectory, filename), buffer);
  return prefix + filename;
}
export async function removeUnusedAffiliationLogo(value?: string | null) {
  if (!value?.startsWith(prefix)) return;
  const filename = value.slice(prefix.length);
  if (!affiliationLogoPattern.test(filename)) return;
  try {
    const rows = await query(
      "SELECT COUNT(*) total FROM affiliation WHERE logo=?",
      [value],
    );
    if (!rows[0].total)
      await unlink(path.join(affiliationLogoDirectory, filename)).catch(
        () => {},
      );
  } catch {
    /* Keep the file if its references cannot be checked. */
  }
}
