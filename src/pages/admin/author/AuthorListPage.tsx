"use client";
import affiliationLabel from "../../../utils/affiliationLabel";
import { useEffect, useState } from "react";
import { Link, useLocation } from "../../../lib/navigation";
import {
  UsersRound,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import State from "../../../components/State";
import Empty from "../../../components/Empty";
import AdminDialog from "../../../components/admin/AdminDialog";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import "./author.css";
export default function AuthorListPage() {
  const { session } = useAdmin(),
    location = useLocation();
  const [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [state, setState] = useState<any>({ loading: true }),
    [notice, setNotice] = useState<any>(location.state?.notice || ""),
    [deleting, setDeleting] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [deleteError, setDeleteError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim() !== search) {
        setSearch(input.trim());
        setPage(1);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [input, search]);
  useEffect(() => {
    const controller = new AbortController();
    setState((old) => ({ ...old, loading: true, error: null }));
    adminApi(`/authors?q=${encodeURIComponent(search)}&page=${page}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!data.authors.length && data.total > 0 && page > 1) {
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
  }, [search, page, retry]);
  async function remove() {
    setBusy(true);
    setDeleteError("");
    try {
      await adminApi("/authors/" + deleting.author_id, {
        method: "DELETE",
        csrfToken: session?.csrfToken,
      });
      setDeleting(null);
      setNotice("Author deleted successfully.");
      setRetry((value) => value + 1);
    } catch (error) {
      setDeleteError(error.message);
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
          <span className="eyebrow muted">FORMS / AUTHOR</span>
          <h1>Author</h1>
          <p>
            Manage authors and researcher profiles connected with your journal.
          </p>
        </div>
        <Link className="btn button" to="/portal/admin/author/add">
          <Plus size={17} /> Add new
        </Link>
      </div>
      {notice && (
        <div className="alert alert-success admin-notice" role="status">
          <span>{notice}</span>
          <button
            className="btn icon-button"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <section className="card admin-table-card">
        <div className="admin-table-toolbar">
          <div>
            <h2>
              <UsersRound size={18} /> All authors{" "}
              <span className="badge">{total}</span>
            </h2>
            <p>View, edit, and maintain author records.</p>
          </div>
          <div className="admin-table-search admin-author-search">
            <Search size={18} />
            <input
              className="form-control"
              aria-label="Search authors"
              placeholder="Search name, code, university, or country…"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              maxLength={200}
            />
            {input && (
              <button
                className="btn icon-button"
                aria-label="Clear search"
                onClick={() => setInput("")}
              >
                <X size={15} />
              </button>
            )}
          </div>
        </div>
        <State {...state} retry={() => setRetry((value) => value + 1)}>
          {state.data?.authors.length ? (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle admin-data-table author-data-table">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Author name</th>
                      <th scope="col">University</th>
                      <th scope="col">Country</th>
                      <th scope="col">Papers</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.authors.map((row) => (
                      <tr key={row.author_id}>
                        <td className="admin-id">#{row.author_id}</td>
                        <td>
                          <strong>
                            {[row.prefix, row.first_name, row.last_name]
                              .filter(Boolean)
                              .join(" ")}
                          </strong>
                          {row.article_count > 0 && (
                            <small className="author-address">
                              Linked to {row.article_count}{" "}
                              {row.article_count === 1 ? "article" : "articles"}
                            </small>
                          )}
                          {row.alternate_name && (
                            <small className="author-address">
                              {row.alternate_name}
                            </small>
                          )}
                          <small className="author-address">
                            {row.address}
                          </small>
                        </td>
                        <td className="author-code">
                          {row.university ||
                            (row.affiliation_id
                              ? affiliationLabel({ country: row.country })
                              : "—")}
                        </td>
                        <td className="author-country">{row.country}</td>
                        <td>{row.papers_published}</td>
                        <td>
                          <span
                            className={
                              "badge admin-status " +
                              (row.status === 1 ? "active" : "inactive")
                            }
                          >
                            {row.status === 1
                              ? "Active"
                              : row.status === 0
                                ? "Inactive"
                                : "Not set"}
                          </span>
                        </td>
                        <td>
                          <div className="admin-row-actions">
                            <Link
                              className="btn admin-edit-button"
                              to={
                                "/portal/admin/author/edit?id=" + row.author_id
                              }
                              aria-label={"Edit " + row.first_name}
                            >
                              <Pencil size={14} />
                              <span>Edit</span>
                            </Link>
                            <button
                              className="btn admin-delete-button"
                              aria-label={"Delete " + row.first_name}
                              onClick={() => {
                                setDeleteError("");
                                setDeleting(row);
                              }}
                            >
                              <Trash2 size={14} />
                              <span>Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="admin-table-footer">
                <span>
                  Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of{" "}
                  {total} records
                </span>
                <div>
                  <button
                    className="btn icon-button"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <span>
                    Page {page} of {pages}
                  </span>
                  <button
                    className="btn icon-button"
                    aria-label="Next page"
                    disabled={page >= pages}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <Empty
              title={search ? "No matching authors" : "No authors yet"}
              text={
                search
                  ? "Try another search term or clear the search."
                  : "Add an author to get started."
              }
              action={
                search ? (
                  <button
                    className="btn button outline"
                    onClick={() => setInput("")}
                  >
                    Clear search
                  </button>
                ) : (
                  <Link className="btn button" to="/portal/admin/author/add">
                    <Plus size={16} /> Add new
                  </Link>
                )
              }
            />
          )}
        </State>
      </section>
      {deleting && (
        <AdminDialog
          title="Delete author?"
          description="This permanently removes the author record."
          busy={busy}
          onClose={() => setDeleting(null)}
        >
          <div className="modal-body">
            <p className="admin-delete-description">
              Are you sure you want to delete{" "}
              <strong>{deleting.first_name}</strong>? This action cannot be
              undone.
            </p>
            {deleteError && (
              <div className="alert alert-danger admin-alert" role="alert">
                {deleteError}
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
              {busy ? (
                <LoaderCircle className="spin" size={16} />
              ) : (
                <Trash2 size={16} />
              )}{" "}
              {busy ? "Deleting…" : "Delete author"}
            </button>
          </div>
        </AdminDialog>
      )}
    </>
  );
}
