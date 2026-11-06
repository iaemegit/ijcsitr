export interface ArticleAuthor {
  author_id: number;
  first_name: string;
  last_name: string;
  university?: string;
  department?: string;
  country?: string;
}
export interface ArticleIssue {
  issue_id: number;
  year: string;
  volume_no: string;
  issue_no: string;
  from_month: string;
  to_month: string;
  status: number | null;
}
export interface ArticleOptions {
  journal: { journal_id: number; journal_name: string };
  issues: ArticleIssue[];
}
export interface ArticleRecord {
  article_id: number;
  article_title: string;
  article_key: string;
  issue_id: number | null;
  year: string;
  volume: string;
  month_from?: string;
  month_to?: string;
  issue: string;
  author_ids: number[];
  authors: ArticleAuthor[];
  corresponding_author: string | null;
  abstract: string;
  keywords: string;
  reference: string;
  copyright: string | null;
  doi: string | null;
  google_scholar: string | null;
  article_file: string | null;
  article_word_file?: string | null;
  date_of_publication: string;
  date_of_received: string | null;
  date_of_acceptance: string | null;
  page_from: string;
  page_to: string;
  status: number | null;
}
export function articleAuthorName(author: ArticleAuthor) {
  return (
    `${author.first_name || ""} ${author.last_name || ""}`.trim() ||
    `Author #${author.author_id}`
  );
}
export function articlePdfDisplayLink(key: string, file: string | null) {
  return file && file.startsWith("/") && /^[A-Za-z0-9_-]{1,100}$/.test(key)
    ? `/index.php/home/article/view/${key}/${key}.pdf`
    : file || "";
}
