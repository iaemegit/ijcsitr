import { query, transaction, db } from "../server/db.ts";
import { currentJournal } from "../server/journal.ts";
import {
  articlePdfPattern,
  nameArticlePdf,
  removeArticleFiles,
  articleUploadDirectory,
} from "../server/article-upload.ts";
import { articlePdfLink } from "../server/article-documents.ts";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
try {
  const journal = await currentJournal();
  if (!journal) throw new Error("Journal not found.");
  const rows = await query(
    "SELECT article_id FROM article WHERE journal_id=? AND (article_pdf_storage IS NOT NULL OR article_file LIKE '/api/articles/files/%')",
    [journal.journal_id],
  );
  for (const row of rows) {
    const created = [];
    let oldStorage, newStorage;
    try {
      await transaction(async (connection) => {
        const [locked] = await connection.execute(
          "SELECT article_key,article_file,article_pdf_storage FROM article WHERE article_id=? AND journal_id=? FOR UPDATE",
          [row.article_id, journal.journal_id],
        );
        const article = locked[0];
        if (!article) return;
        oldStorage = article.article_pdf_storage || article.article_file;
        const oldName = articlePdfPattern.exec(oldStorage || "")?.[1];
        if (!oldName) return;
        const link = articlePdfLink(article.article_key);
        const before = digest(
          await readFile(path.join(articleUploadDirectory, oldName)),
        );
        newStorage = await nameArticlePdf(
          oldStorage,
          article.article_key,
          created,
        );
        const newName = articlePdfPattern.exec(newStorage)[1];
        if (
          digest(await readFile(path.join(articleUploadDirectory, newName))) !==
          before
        )
          throw new Error("PDF contents changed unexpectedly.");
        await connection.execute(
          "UPDATE article SET article_file=?,article_pdf_storage=? WHERE article_id=? AND journal_id=?",
          [link, newStorage, row.article_id, journal.journal_id],
        );
      });
    } catch (error) {
      await removeArticleFiles(created);
      throw error;
    }
    if (oldStorage && newStorage && oldStorage !== newStorage) {
      const refs = await query(
        "SELECT article_id FROM article WHERE article_file=? OR article_pdf_storage=? LIMIT 1",
        [oldStorage, oldStorage],
      );
      if (!refs.length)
        await removeArticleFiles([
          path.join(
            articleUploadDirectory,
            articlePdfPattern.exec(oldStorage)[1],
          ),
        ]);
    }
    if (newStorage)
      console.log(
        `Article ${row.article_id}: ${path.basename(newStorage)}; PDF contents verified unchanged.`,
      );
  }
} finally {
  await db.end();
}
