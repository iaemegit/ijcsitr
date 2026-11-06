import { Router } from "express";
import multer from "multer";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { query } from "./db";
import {
  articleUploadDirectory,
  validArticlePdf,
  streamArticleFile,
  removeArticleFiles,
} from "./article-upload";

type Pending = {
  user: number;
  kind: "pdf" | "word";
  storage: string;
  name: string;
  expires: number;
};
const pending = new Map<string, Pending>();
export const wordPattern =
  /^\/(?:articles\/word_files|api\/admin\/articles\/word-files)\/([a-f0-9-]{36}\.(?:docx|doc))$/;
export const articleWordDirectory = path.join(
  articleUploadDirectory,
  "word_files",
);
export function wordFilePath(storage: string) {
  const filename = wordPattern.exec(storage || "")?.[1];
  return filename
    ? path.join(
        storage.startsWith("/articles/word_files/")
          ? articleWordDirectory
          : articleUploadDirectory,
        filename,
      )
    : null;
}
export const canonicalPdfPattern =
  /^\/index\.php\/home\/article\/view\/([A-Za-z0-9_-]{1,100})\/\1\.pdf$/;
export function articlePdfLink(key: string) {
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(key))
    throw new Error("INVALID_ARTICLE_FILE_KEY");
  return `/index.php/home/article/view/${key}/${key}.pdf`;
}
export function pendingDocument(
  token: string | undefined,
  user: number,
  kind: "pdf" | "word",
) {
  const upload = token ? pending.get(token) : undefined;
  return upload &&
    upload.user === user &&
    upload.kind === kind &&
    upload.expires > Date.now()
    ? upload
    : null;
}
export function consumeDocument(token: string | undefined) {
  if (token) pending.delete(token);
}
export function validWord(file: Express.Multer.File) {
  const ext = path.extname(file.originalname).toLowerCase();
  return ext === ".doc"
    ? file.buffer.subarray(0, 8).equals(Buffer.from("d0cf11e0a1b11ae1", "hex"))
    : ext === ".docx" &&
        file.buffer.subarray(0, 4).equals(Buffer.from("504b0304", "hex")) &&
        file.buffer.includes(Buffer.from("word/")) &&
        file.buffer.includes(Buffer.from("[Content_Types].xml"));
}
export function streamWord(res, storage: string) {
  const target = wordFilePath(storage);
  if (!target) return res.sendStatus(404);
  const filename = path.basename(target);
  res.set({
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  });
  return res.download(target, filename, (error) => {
    if (error && !res.headersSent) res.sendStatus(404);
  });
}
const multipart = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1, fields: 1 },
}).single("file");
export const articleDocuments = Router();
articleDocuments.post(
  "/uploads/:kind",
  (req, res, next) =>
    multipart(req, res, (error) =>
      error
        ? res.status(400).json({
            error: "Choose one PDF or Word file, no larger than 10 MB.",
          })
        : next(),
    ),
  async (req, res) => {
    const kind = req.params.kind;
    if (kind !== "pdf" && kind !== "word") return res.sendStatus(404);
    if (
      !req.file ||
      !(kind === "pdf" ? validArticlePdf(req.file) : validWord(req.file))
    )
      return res.status(400).json({
        error:
          kind === "pdf"
            ? "Choose a valid PDF file."
            : "Choose a valid Word (.doc or .docx) file.",
      });
    for (const [token, upload] of pending) {
      if (upload.expires > Date.now()) continue;
      // Successful saves consume tickets; retain a file if another request saved it.
      const rows = await query(
        "SELECT article_id FROM article WHERE article_pdf_storage=? OR article_word_file=? LIMIT 1",
        [upload.storage, upload.storage],
      );
      if (!rows.length)
        await removeArticleFiles([
          wordFilePath(upload.storage) ||
            path.join(articleUploadDirectory, path.basename(upload.storage)),
        ]);
      pending.delete(token);
    }
    if (pending.size >= 1000)
      return res
        .status(429)
        .json({ error: "Too many pending uploads. Try again later." });
    const extension =
      kind === "pdf"
        ? ".pdf"
        : path.extname(req.file.originalname).toLowerCase();
    const filename = randomUUID() + extension;
    const storage =
      (kind === "pdf" ? "/api/articles/files/" : "/articles/word_files/") +
      filename;
    const directory =
      kind === "word" ? articleWordDirectory : articleUploadDirectory;
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), req.file.buffer);
    const token = randomUUID();
    pending.set(token, {
      user: req.adminUser!.user_id,
      kind,
      storage,
      name: req.file.originalname,
      expires: Date.now() + 24 * 60 * 60 * 1000,
    });
    res.status(201).json({
      token,
      name: req.file.originalname,
      link: `/api/admin/articles/uploads/${kind}/${token}`,
    });
  },
);
articleDocuments.get("/uploads/:kind/:token", (req, res) => {
  const kind = req.params.kind;
  if (kind !== "pdf" && kind !== "word") return res.sendStatus(404);
  const upload = pendingDocument(
    req.params.token as string,
    req.adminUser!.user_id,
    kind,
  );
  if (!upload) return res.sendStatus(404);
  return kind === "pdf"
    ? streamArticleFile(res, upload.storage)
    : streamWord(res, upload.storage);
});
