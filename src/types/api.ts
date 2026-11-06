export interface AdminSession {
  user: { id: number; name: string };
  csrfToken: string;
}
export interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}
export interface ArticleAuthor {
  id: number;
  name: string;
  university: string;
}
export interface ArticleSummary {
  article_id: number;
  article_key: string;
  article_title: string;
  abstract: string;
  year: string;
  volume: string;
  issue: string;
  date_of_publication: string;
  doi: string | null;
  keywords: string;
  page_from: string;
  page_to: string;
  views: number | null;
  downloads: number | null;
  citation: number | null;
  authors: ArticleAuthor[];
  doi_url: string | null;
  file_url?: string | null;
}
export interface JournalPayload {
  journal: {
    journal_id: number;
    journal_name: string;
    journal_key: string;
    about_us: string;
    subject_area: string;
    issn_online: string | null;
    issn_print: string | null;
    start_year?: string | null;
    publication_frequency?: string | null;
    email?: string | null;
  };
  stats: {
    articles: number;
    authors: number;
    issues: number;
    countries: number;
  };
  years: string[];
  latest: ArticleSummary[];
  currentIssue: {
    issue_id: number;
    year: string;
    volume_no: string;
    issue_no: string;
    from_month: string;
    to_month: string;
  } | null;
}
export interface SavedArticle {
  id: number;
  title: string;
  year: string;
}
export type FormErrors = Record<string, string[]>;
