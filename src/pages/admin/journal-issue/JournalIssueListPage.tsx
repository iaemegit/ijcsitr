"use client";
import { useEffect, useState, useRef } from "react";
import { Link, useLocation } from "../../../lib/navigation";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import State from "../../../components/State";
import AdminDialog from "../../../components/admin/AdminDialog";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import "./journal-issue.css";
import IssueAuditDate from "./IssueAuditDate";
const pageSize = 6;
export default function JournalIssueListPage() {
  const { session } = useAdmin(),
    location = useLocation();
  const [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const selectAll = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<any>({ loading: true }),
    [notice, setNotice] = useState<any>(location.state?.notice || ""),
    [deleting, setDeleting] = useState<any>(null),
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
      `/journal-issues?q=${encodeURIComponent(search)}&page=${page}&limit=${pageSize}&sort=oldest`,
      {
        signal: controller.signal,
      },
    )
      .then((data) => {
        if (!data.issues.length && data.total && page > 1) {
          setPage(Math.max(1, Math.ceil(data.total / data.limit)));
          return;
        }
        setState({ data, loading: false });
        setSelected(new Set());
      })
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [search, page, retry]);
  useEffect(() => {
    if (selectAll.current)
      selectAll.current.indeterminate =
        selected.size > 0 && selected.size < (state.data?.issues.length || 0);
  }, [selected, state.data]);
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await adminApi("/journal-issues/" + deleting.issue_id, {
        method: "DELETE",
        csrfToken: session?.csrfToken,
      });
      setDeleting(null);
      setNotice("Journal issue deleted successfully.");
      setRetry((value) => value + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const total = state.data?.total || 0,
    pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / JOURNAL ISSUE</span>
          <h1>Journal Issue</h1>
          <p>Manage volumes, issues, publication periods and special issues.</p>
        </div>
        <Link className="btn button" to="/portal/admin/journal-issue/add">
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
      <section className="card admin-table-card journal-issues-card">
        <div className="admin-table-toolbar">
          <div>
            <h2>
              All journal issues <span className="badge">{total}</span>
            </h2>
            <p>{state.data?.journal.journal_name}</p>
          </div>
          <div className="admin-table-search">
            <Search size={18} />
            <input
              className="form-control"
              aria-label="Search journal issues"
              placeholder="Search title, year, volume or issue..."
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
        <State {...state} retry={() => setRetry((value) => value + 1)}>
          {state.data &&
            (state.data.issues.length ? (
              <>
                {selected.size > 0 && (
                  <div className="issue-selection-count" role="status">
                    {selected.size} journal{" "}
                    {selected.size === 1 ? "issue" : "issues"} selected{" "}
                    <button
                      className="btn btn-link btn-sm"
                      onClick={() => setSelected(new Set())}
                    >
                      Clear selection
                    </button>
                  </div>
                )}
                <div className="table-responsive">
                  <table className="table table-hover align-middle admin-data-table issue-data-table">
                    <thead>
                      <tr>
                        <th scope="col">
                          <input
                            ref={selectAll}
                            className="form-check-input issue-checkbox"
                            type="checkbox"
                            aria-label="Select all issues on this page"
                            checked={selected.size === state.data.issues.length}
                            onChange={(event) =>
                              setSelected(
                                event.target.checked
                                  ? new Set(
                                      state.data.issues.map(
                                        (row) => row.issue_id,
                                      ),
                                    )
                                  : new Set(),
                              )
                            }
                          />
                        </th>
                        {[
                          "S.No",
                          "Volume No",
                          "Issue No",
                          "From Month",
                          "To Month",
                          "Year",
                          "Special Issue",
                          "Created User ID",
                          "Created Date",
                          "Updated User ID",
                          "Updated Date",
                          "Status",
                          "Actions",
                        ].map((label) => (
                          <th key={label} scope="col">
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {state.data.issues.map((row, index) => (
                        <tr
                          key={row.issue_id}
                          className={
                            selected.has(row.issue_id) ? "issue-selected" : ""
                          }
                        >
                          <td>
                            <input
                              className="form-check-input issue-checkbox"
                              type="checkbox"
                              aria-label={"Select issue " + row.issue_id}
                              checked={selected.has(row.issue_id)}
                              onChange={(event) =>
                                setSelected((old) => {
                                  const next = new Set(old);
                                  event.target.checked
                                    ? next.add(row.issue_id)
                                    : next.delete(row.issue_id);
                                  return next;
                                })
                              }
                            />
                          </td>
                          <td>{(page - 1) * pageSize + index + 1}</td>
                          <td>{row.volume_no}</td>
                          <td>{row.issue_no}</td>
                          <td>{row.from_month}</td>
                          <td>{row.to_month}</td>
                          <td>{row.year}</td>
                          <td>{row.special_issue || "No"}</td>
                          <td>{row.created_userid ?? "—"}</td>
                          <td className="issue-audit-date">
                            <IssueAuditDate value={row.created_date} />
                          </td>
                          <td>{row.updated_userid ?? "—"}</td>
                          <td className="issue-audit-date">
                            <IssueAuditDate value={row.updated_date} />
                          </td>
                          <td>
                            <span>
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
                                  "/portal/admin/journal-issue/edit?id=" +
                                  row.issue_id
                                }
                                aria-label={"Edit issue " + row.issue_id}
                              >
                                <Pencil size={14} /> Edit
                              </Link>
                              <button
                                className="btn admin-delete-button"
                                aria-label={"Delete issue " + row.issue_id}
                                onClick={() => {
                                  setError("");
                                  setDeleting(row);
                                }}
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="admin-table-footer issue-table-footer">
                  <span>
                    Showing {(page - 1) * pageSize + 1} to{" "}
                    {Math.min(page * pageSize, total)} of {total} journal issues
                  </span>
                  <div>
                    <button
                      className="btn issue-page-button"
                      aria-label="Previous page"
                      disabled={page <= 1}
                      onClick={() => setPage((value) => value - 1)}
                    >
                      Previous
                    </button>
                    <span
                      className="issue-current-page"
                      aria-label={`Page ${page} of ${pages}`}
                      aria-current="page"
                    >
                      {page}
                    </span>
                    <button
                      className="btn issue-page-button"
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
                  {search ? "No matching issues" : "No journal issues yet"}
                </h2>
                <p>
                  {search
                    ? "Try another search or clear the search."
                    : "Use Add new to create the first issue."}
                </p>
              </div>
            ))}
        </State>
      </section>
      {deleting && (
        <AdminDialog
          title="Delete journal issue?"
          description="Issues containing articles cannot be deleted."
          busy={busy}
          onClose={() => setDeleting(null)}
        >
          <div className="modal-body">
            <p>
              Delete {deleting.year}, Volume {deleting.volume_no}, Issue{" "}
              {deleting.issue_no}? This permanently removes the issue record.
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
              {busy ? "Deleting..." : "Delete journal issue"}
            </button>
          </div>
        </AdminDialog>
      )}
    </>
  );
}
