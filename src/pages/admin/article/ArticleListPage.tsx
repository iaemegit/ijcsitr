"use client";
import { useEffect, useState } from "react";
import { Link, useLocation } from "../../../lib/navigation";
import { Plus, Search, Pencil, Trash2, FileText } from "lucide-react";
import adminApi from "../../../services/adminApi";
import { useAdmin } from "../../../context/AdminContext";
import State from "../../../components/State";
import AdminDialog from "../../../components/admin/AdminDialog";
import {
  articleAuthorName,
  articlePdfDisplayLink,
  type ArticleRecord,
} from "./article-types";
import "./article.css";
type ArticleList = {
  articles: ArticleRecord[];
  total: number;
  page: number;
  limit: number;
  journal: { journal_name: string };
};
export default function ArticleListPage() {
  const { session } = useAdmin(),
    location = useLocation();
  const [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [notice, setNotice] = useState(location.state?.notice || "");
  const [state, setState] = useState<{
      data?: ArticleList;
      loading: boolean;
      error?: string;
    }>({ loading: true }),
    [deleting, setDeleting] = useState<ArticleRecord | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    if (input.trim() === search) return;
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [input, search]);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    adminApi(
      `/articles?q=${encodeURIComponent(search)}&page=${page}${status ? "&status=" + status : ""}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!data.articles.length && data.total > 0 && page > 1) {
          setPage(Math.max(1, Math.ceil(data.total / data.limit)));
          return;
        }
        setState({ data, loading: false });
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [page, search, status, retry]);
  async function remove() {
    if (!deleting) return;
    setBusy(true);
    setError("");
    try {
      await adminApi("/articles/" + deleting.article_id, {
        method: "DELETE",
        csrfToken: session?.csrfToken,
      });
      setDeleting(null);
      setNotice("Article deleted successfully.");
      setRetry((value) => value + 1);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  const total = state.data?.total || 0,
    pages = Math.max(1, Math.ceil(total / 10));
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / ARTICLE</span>
          <h1>Article</h1>
          <p>
            Manage article details, authors, journal issues and publication
            status.
          </p>
        </div>
        <Link className="btn button" to="/portal/admin/article/add">
          <Plus size={17} /> Add new
        </Link>
      </div>
      {notice && (
        <div className="alert alert-success admin-notice" role="status">
          <span>{notice}</span>
          <button
            className="btn"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            ×
          </button>
        </div>
      )}
      <section className="card admin-table-card">
        <div className="admin-table-toolbar">
          <div>
            <h2>
              <FileText size={18} /> All articles{" "}
              <span className="badge">{total}</span>
            </h2>
            <p>{state.data?.journal.journal_name}</p>
          </div>
          <div className="article-list-filters">
            <select
              className="form-select"
              aria-label="Filter article status"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All statuses</option>
              <option value="1">Published</option>
              <option value="0">Draft</option>
            </select>
            <div className="admin-table-search">
              <Search size={18} />
              <input
                className="form-control"
                aria-label="Search articles"
                placeholder="Search title, key, author, DOI or year..."
                maxLength={200}
                value={input}
                onChange={(event) => setInput(event.target.value)}
              />
              {input && (
                <button
                  className="btn"
                  aria-label="Clear search"
                  onClick={() => setInput("")}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        </div>
        <State {...state} retry={() => setRetry((value) => value + 1)}>
          {state.data &&
            (state.data.articles.length ? (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle admin-data-table article-data-table">
                    <thead>
                      <tr>
                        {[
                          "ID",
                          "Article title / key",
                          "Authors",
                          "Issue",
                          "Publication Date",
                          "Status",
                          "PDF link",
                          "Actions",
                        ].map((label) => (
                          <th scope="col" key={label}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.data.articles.map((article) => (
                        <tr key={article.article_id}>
                          <td>#{article.article_id}</td>
                          <td>
                            <strong>{article.article_title}</strong>
                            <small className="d-block">
                              {article.article_key}
                            </small>
                          </td>
                          <td>
                            {article.authors.map((author) => (
                              <span className="d-block" key={author.author_id}>
                                {articleAuthorName(author)}{" "}
                                <small>#{author.author_id}</small>
                              </span>
                            ))}
                          </td>
                          <td>
                            {article.year}
                            <small className="d-block">
                              Vol. {article.volume} / Issue {article.issue}
                            </small>
                          </td>
                          <td>
                            {article.date_of_publication?.slice(0, 10) || "—"}
                          </td>
                          <td>
                            <span
                              className={
                                "badge admin-status " +
                                (article.status === 1 ? "active" : "inactive")
                              }
                            >
                              {article.status === 1
                                ? "Published"
                                : article.status === 0
                                  ? "Draft"
                                  : "Not set"}
                            </span>
                          </td>
                          <td className="article-pdf-link-cell">
                            {article.article_file &&
                            /^(https?:\/\/|\/(?!\/))/i.test(
                              article.article_file,
                            ) ? (
                              <a
                                href={
                                  article.article_file.startsWith("/") &&
                                  article.status !== 1
                                    ? `/api/admin/articles/${article.article_id}/file`
                                    : articlePdfDisplayLink(
                                        article.article_key,
                                        article.article_file,
                                      )
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={`Open PDF for article ${article.article_id}`}
                              >
                                {articlePdfDisplayLink(
                                  article.article_key,
                                  article.article_file,
                                )}
                              </a>
                            ) : (
                              <span className="text-muted">No PDF</span>
                            )}
                          </td>
                          <td>
                            <div className="admin-row-actions">
                              <Link
                                className="btn admin-edit-button"
                                to={
                                  "/portal/admin/article/edit?id=" +
                                  article.article_id
                                }
                                aria-label={
                                  "Edit article " + article.article_id
                                }
                              >
                                <Pencil size={14} /> Edit
                              </Link>
                              <button
                                className="btn admin-delete-button"
                                aria-label={
                                  "Delete article " + article.article_id
                                }
                                onClick={() => {
                                  setError("");
                                  setDeleting(article);
                                }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                              {article.status === 1 && (
                                <Link
                                  className="btn btn-sm"
                                  to={"/articles/" + article.article_id}
                                >
                                  View
                                </Link>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="admin-table-footer">
                  <span>
                    Showing {(page - 1) * 10 + 1} to{" "}
                    {Math.min(page * 10, total)} of {total} articles
                  </span>
                  <div>
                    <button
                      className="btn"
                      aria-label="Previous page"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      Previous
                    </button>
                    <span>
                      Page {page} of {pages}
                    </span>
                    <button
                      className="btn"
                      aria-label="Next page"
                      disabled={page >= pages}
                      onClick={() => setPage((value) => value + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-5 text-center">
                <h2>
                  {search || status
                    ? "No matching articles"
                    : "No articles yet"}
                </h2>
                <p>
                  {search || status
                    ? "Change your search or status filter."
                    : "Use Add new to create an article."}
                </p>
              </div>
            ))}
        </State>
      </section>
      {deleting && (
        <AdminDialog
          title="Delete article?"
          description="This permanently removes the article and its uploaded PDF from the journal."
          busy={busy}
          onClose={() => setDeleting(null)}
        >
          <div className="modal-body">
            <p>
              Delete <strong>{deleting.article_title}</strong>? Published
              articles will disappear from the public library and issue
              archives. Authors and affiliations will remain.
            </p>
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button
              className="btn button outline"
              disabled={busy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={remove}>
              {busy ? "Deleting..." : "Delete article"}
            </button>
          </div>
        </AdminDialog>
      )}
    </>
  );
}
