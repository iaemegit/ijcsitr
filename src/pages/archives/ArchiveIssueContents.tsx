"use client";
import { useState } from "react";
import {
  ArrowUpRight,
  Eye,
  Download,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Link } from "../../lib/navigation";
import useApi from "../../hooks/useApi";
import State from "../../components/State";
import ArticlePdfButton from "../../components/ArticlePdfButton";
import type { ArticleSummary } from "../../types/api";
import type { ArchiveIssue } from "./archive-types";
function publicationDate(value: string) {
 if (!value) return "Date unavailable";
 const date = new Date(value.slice(0, 10) + "T00:00:00Z");
 return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString("en-GB", {day:"numeric",month:"short",year:"numeric",timeZone:"UTC"});
}
export default function ArchiveIssueContents({
  issue,
}: {
  issue: ArchiveIssue;
}) {
  const [page, setPage] = useState(1);
  const state = useApi<{
    articles: ArticleSummary[];
    total: number;
    limit: number;
  }>(
    "/articles?" +
      new URLSearchParams({
        year: issue.year,
        volume: issue.volume_no,
        issue: issue.issue_no,
        page: String(page),
      }),
  );
  const total = state.data?.total || 0,
    limit = state.data?.limit || 6,
    pages = Math.ceil(total / limit);
  return (
    <>
      <section
        className="archive-selected-header"
        aria-labelledby="selected-issue-title"
      >
        <img
          src="/images/journal-cover.jpg"
          alt="IJCSITR journal cover"
          width={766}
          height={1074}
        />
        <div>
          <span className="archive-latest-label">IJCSITR / {issue.year}</span>
          <h2 id="selected-issue-title">
            Volume {issue.volume_no}, Issue {issue.issue_no}
          </h2>
          <p>
            {[
              issue.from_month,
              issue.to_month !== issue.from_month ? issue.to_month : "",
            ]
              .filter(Boolean)
              .join(" - ")}{" "}
            {issue.year}
          </p>
          {(issue.special_issue_title || issue.title) && (
            <p>{issue.special_issue_title || issue.title}</p>
          )}
          <span className="archive-open-access">Open access</span>
        </div>
      </section>
      <div className="archive-contents-heading">
        <h3>In this issue</h3>
        <span>
          {issue.article_count}{" "}
          {issue.article_count === 1 ? "article" : "articles"}
        </span>
      </div>
      <div aria-live="polite">
        <State {...state}>
          <div className="archive-articles">
            {state.data?.articles.map((article, index) => (
              <article
                key={article.article_id}
                className="archive-article-card"
              >
                <div className="archive-article-kicker">
                  <span>RESEARCH ARTICLE</span>
                  <span>
                    {String((page - 1) * limit + index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h4>
                  <Link to={"/articles/" + article.article_id}>
                    {article.article_title}
                  </Link>
                </h4>
                <p className="archive-article-authors">
                  {article.authors.map((a) => a.name).join(", ") ||
                    "IJCSITR contributors"}
                </p>
                <dl className="archive-article-metadata">
                  <div>
                    <dt>Article ID</dt>
                    <dd>{article.article_key || article.article_id}</dd>
                  </div>
                  <div>
                    <dt>Published</dt>
                    <dd>{publicationDate(article.date_of_publication)}</dd>
                  </div>
                  <div>
                    <dt>Pages</dt>
                    <dd>
                      {article.page_from || "—"} - {article.page_to || "—"}
                    </dd>
                  </div>
                </dl>
                <div className="archive-article-footer">
                  <div>
                    <span>
                      <Eye size={14} aria-hidden="true" /> {article.views || 0}{" "}
                      views
                    </span>
                    <span>
                      <Download size={14} aria-hidden="true" />{" "}
                      {article.downloads || 0} downloads
                    </span>
                  </div>
                  <div className="d-flex align-items-center flex-wrap gap-3">
                  <ArticlePdfButton url={article.file_url} title={article.article_title} />
                  <Link to={"/articles/" + article.article_id}>
                    Read article <ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
          {state.data && !total && (
            <div className="archive-no-match">
              No published articles are available in this issue yet.
            </div>
          )}
          {pages > 1 && (
            <nav
              className="archive-pagination"
              aria-label="Issue article pages"
            >
              <button
                className="btn btn-outline-secondary"
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft size={15} />
                Previous
              </button>
              <span>
                Page {page} of {pages}
              </span>
              <button
                className="btn btn-outline-secondary"
                disabled={page === pages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
                <ChevronRight size={15} />
              </button>
            </nav>
          )}
        </State>
      </div>
    </>
  );
}
