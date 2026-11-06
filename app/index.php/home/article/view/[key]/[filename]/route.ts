import { readFile } from "node:fs/promises";
import path from "node:path";
import { query } from "../../../../../../../server/db";
import { currentJournal } from "../../../../../../../server/journal";
import {
  articlePdfPattern,
  articleUploadDirectory,
} from "../../../../../../../server/article-upload";
export const runtime = "nodejs";
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string; filename: string }> },
) {
  const { key, filename } = await params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(key) || filename !== key + ".pdf")
    return new Response("PDF not found", { status: 404 });
  const journal = await currentJournal();
  const rows = journal
    ? await query(
        "SELECT article_pdf_storage,article_file FROM article WHERE article_key=? AND journal_id=? AND status=1 LIMIT 1",
        [key, journal.journal_id],
      )
    : [];
  const storage = rows[0]?.article_pdf_storage || rows[0]?.article_file || "";
  const storedName = articlePdfPattern.exec(storage)?.[1];
  if (!storedName) return new Response("PDF not found", { status: 404 });
  try {
    const bytes = await readFile(path.join(articleUploadDirectory, storedName));
    return new Response(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("PDF not found", { status: 404 });
  }
}
