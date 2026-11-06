import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import path from "node:path";
import { unlink, readFile } from "node:fs/promises";
import {
  saveBoardPhoto,
  BoardPhotoError,
  boardPhotoDirectory,
  boardPhotoPrefix,
} from "./editorial-board-upload.ts";
test("editorial photos reject fake images and convert valid PNG to WebP", async () => {
  await assert.rejects(
    () =>
      saveBoardPhoto({
        buffer: Buffer.from("fake image"),
        mimetype: "image/png",
      }),
    BoardPhotoError,
  );
  const buffer = await sharp({
    create: { width: 24, height: 24, channels: 4, background: "#087f8c" },
  })
    .png()
    .toBuffer();
  const url = await saveBoardPhoto({ buffer, mimetype: "image/png" });
  assert.ok(url.startsWith(boardPhotoPrefix));
  const filename = url.slice(boardPhotoPrefix.length);
  assert.match(filename, /^[a-f0-9-]{36}\.webp$/);
  const target = path.join(boardPhotoDirectory, filename);
  try {
    assert.equal((await sharp(await readFile(target)).metadata()).format, "webp");
  } finally {
    await unlink(target);
  }
});
