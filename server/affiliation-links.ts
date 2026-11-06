import { query } from "./db";
import { authorIds, plain } from "./content";

export interface AffiliationAuthorLink {
  author_id: number;
  name: string;
  article_ids: number[];
}
export async function affiliationAuthors(
  affiliationId: number,
): Promise<AffiliationAuthorLink[]> {
  const authors: {
    author_id: number;
    first_name: string;
    last_name: string | null;
  }[] = await query(
    `SELECT a.author_id,a.first_name,a.last_name FROM author a WHERE a.affiliation_id=? OR EXISTS (SELECT 1 FROM author_affiliation aa WHERE aa.author_id=a.author_id AND aa.affiliation_id=?) ORDER BY a.author_id`,
    [affiliationId, affiliationId],
  );
  if (!authors.length) return [];
  const articles: { article_id: number; author_ids: string | null }[] =
    await query(
      "SELECT article_id,author_ids FROM article ORDER BY article_id",
    );
  const byAuthor = new Map(
    authors.map((author) => [author.author_id, [] as number[]]),
  );
  for (const article of articles)
    for (const id of authorIds(article.author_ids))
      byAuthor.get(id)?.push(article.article_id);
  return authors.map((author) => ({
    author_id: author.author_id,
    name: plain(`${author.first_name || ""} ${author.last_name || ""}`),
    article_ids: byAuthor.get(author.author_id) || [],
  }));
}
