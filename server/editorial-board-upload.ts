import multer from "multer";
import sharp from "sharp";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { query } from "./db";
export const boardPhotoDirectory = path.join(
  process.cwd(),
  "uploads/editorial-board",
);
export const boardPhotoPattern = /^[a-f0-9-]{36}\.webp$/;
export const boardPhotoPrefix = "/api/admin/editorial-board/photos/";
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 32 * 1024,
  },
}).single("profile_photo_file");
export function parseBoardPhoto(req, res, next) {
  upload(req, res, (error) => {
    if (error)
      return res
        .status(400)
        .json({
          error:
            error.code === "LIMIT_FILE_SIZE"
              ? "The profile photo must be 5 MB or smaller."
              : "The profile photo upload could not be accepted.",
        });
    if (req.is("multipart/form-data")) {
      try {
        req.body = JSON.parse(req.body.data);
      } catch {
        return res.status(400).json({ error: "Invalid board member data." });
      }
    }
    next();
  });
}
export class BoardPhotoError extends Error {}
export async function saveBoardPhoto(file?: Express.Multer.File) {
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
    throw new BoardPhotoError("Choose a valid JPG, PNG or WebP profile photo.");
  }
  await mkdir(boardPhotoDirectory, { recursive: true });
  const filename = randomUUID() + ".webp";
  const target = path.join(boardPhotoDirectory, filename);
  try {
    await writeFile(target, buffer);
  } catch (error) {
    await unlink(target).catch(() => {});
    throw error;
  }
  return boardPhotoPrefix + filename;
}
export async function removeUnusedBoardPhoto(value?: string | null) {
  if (!value?.startsWith(boardPhotoPrefix)) return;
  const filename = value.slice(boardPhotoPrefix.length);
  if (!boardPhotoPattern.test(filename)) return;
  try {
    const rows = await query(
      "SELECT COUNT(*) total FROM editorial_board WHERE profile_photo=?",
      [value],
    );
    if (!rows[0].total)
      await unlink(path.join(boardPhotoDirectory, filename)).catch(() => {});
  } catch {
    /* Keep files if references cannot be checked. */
  }
}
