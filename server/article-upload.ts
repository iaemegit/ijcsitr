import multer from "multer";
import path from "node:path";
import { mkdir, writeFile, unlink, copyFile, rmdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
export const articleUploadDirectory = path.join(
  process.cwd(),
  "uploads/articles",
);
export const articlePdfPattern =
  /^\/api\/articles\/files\/([a-f0-9-]{36}(?:\.pdf|\/[A-Za-z0-9_-]{1,100}\.pdf))$/;
export async function nameArticlePdf(
  storage: string,
  key: string,
  createdPaths: string[],
) {
  const source = articlePdfPattern.exec(storage)?.[1];
  if (!source || !/^[A-Za-z0-9_-]{1,100}$/.test(key))
    throw new Error("Invalid article PDF name.");
  if (path.basename(source) === key + ".pdf") return storage;
  // A revision folder prevents overwriting the saved PDF before the database commit.
  const relative = randomUUID() + "/" + key + ".pdf";
  const target = path.join(articleUploadDirectory, relative);
  await mkdir(path.dirname(target), { recursive: true });
  createdPaths.push(target);
  await copyFile(path.join(articleUploadDirectory, source), target);
  return "/api/articles/files/" + relative;
}
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
    fields: 1,
    fieldSize: 256 * 1024,
  },
}).single("article_pdf");
export function parseArticleUpload(req, res, next) {
  upload(req, res, (error) =>
    error
      ? res.status(400).json({
          error:
            error.code === "LIMIT_FILE_SIZE"
              ? "The article PDF must be 10 MB or smaller."
              : "The article upload could not be accepted.",
        })
      : next(),
  );
}
export function validArticlePdf(file: Express.Multer.File) {
  return (
    file.mimetype === "application/pdf" &&
    path.extname(file.originalname).toLowerCase() === ".pdf" &&
    file.buffer.subarray(0, 5).toString() === "%PDF-"
  );
}
export async function writeArticlePdf(
  file: Express.Multer.File,
  createdPaths: string[],
) {
  const filename = randomUUID() + ".pdf";
  await mkdir(articleUploadDirectory, { recursive: true });
  const target = path.join(articleUploadDirectory, filename);
  createdPaths.push(target);
  await writeFile(target, file.buffer);
  return "/api/articles/files/" + filename;
}
export async function removeArticleFiles(paths: string[]) {
  await Promise.allSettled(
    paths.map(async (file) => {
      await unlink(file);
      const directory = path.dirname(file);
      if (
        path.dirname(directory) === articleUploadDirectory &&
        /^[a-f0-9-]{36}$/.test(path.basename(directory))
      )
        await rmdir(directory).catch(() => {});
    }),
  );
}
export function streamArticleFile(res, url: string) {
  const filename = articlePdfPattern.exec(url)?.[1];
  if (!filename)
    return res.status(404).json({ error: "Uploaded PDF not found." });
  res
    .set("X-Content-Type-Options", "nosniff")
    .set("Content-Type", "application/pdf")
    .set("Cache-Control", "no-store");
  return res.sendFile(path.join(articleUploadDirectory, filename), (error) => {
    if (error && !res.headersSent)
      res.status(404).json({ error: "PDF not found." });
  });
}
