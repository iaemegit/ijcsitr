"use client";
import { useEffect, useState } from "react";
import { Link, useLocation } from "../../lib/navigation";
import { useAdmin } from "../../context/AdminContext";
import adminApi from "../../services/adminApi";
import State from "../State";
import AdminDialog from "./AdminDialog";
import type { ContentConfig, ContentRecord } from "./content-types";
import "./content-admin.css";
type ListData = {
  records: ContentRecord[];
  total: number;
  page: number;
  limit: number;
};
export default function ContentList({ config }: { config: ContentConfig }) {
  const { session } = useAdmin(),
    location = useLocation(),
    base = "/portal/admin/" + config.key;
  const [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [state, setState] = useState<{
      loading: boolean;
      error?: string;
      data?: ListData;
    }>({ loading: true });
  const [notice, setNotice] = useState(location.state?.notice || ""),
    [deleting, setDeleting] = useState<ContentRecord | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    const controller = new AbortController();
    setState((old) => ({ ...old, loading: true, error: undefined }));
    adminApi(
      `/resources/${config.key}?q=${encodeURIComponent(search)}&page=${page}${status ? "&status=" + status : ""}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!data.records.length && data.total > 0 && page > 1) {
          setPage(Math.ceil(data.total / data.limit));
          return;
        }
        setState({ loading: false, data });
      })
      .catch((err) => {
        if (err.name !== "AbortError")
          setState({ loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [config.key, search, status, page, retry]);
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await adminApi(`/resources/${config.key}/${deleting![config.id]}`, {
        method: "DELETE",
        csrfToken: session?.csrfToken,
      });
      setDeleting(null);
      setNotice(`${config.title} record deleted.`);
      setRetry((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  function label(key: string) {
    return key === "status"
      ? "Status"
      : key === "created_date"
        ? "Created Date"
        : config.fields.find((field) => field.key === key)?.label || key;
  }
  function cell(record: ContentRecord, key: string) {
    if (config.key === "join-us" && key === "created_date") {
      const date = record[key] ? new Date(String(record[key])) : null;
      return date && !Number.isNaN(date.getTime())
        ? date.toLocaleString("en-GB", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "—";
    }
    if (key === "status")
      return record.status === 1
        ? "Active"
        : record.status === 0
          ? config.key === "online-papers" || config.key === "join-us"
            ? "Pending"
            : "Inactive"
          : "Not set";
    return String(record[key] ?? "—");
  }
  const data = state.data;
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">
            FORMS / {config.title.toUpperCase()}
          </span>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>
        {config.create && (
          <Link to={base + "/add"} className="btn button">
            Add new
          </Link>
        )}
      </div>
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      <div className="content-admin-toolbar">
        <input
          className="form-control"
          aria-label={`Search ${config.title}`}
          placeholder="Search records…"
          value={input}
          maxLength={200}
          onChange={(e) => setInput(e.target.value)}
        />
        {config.status && (
          <select
            className="form-select"
            aria-label={`Filter ${config.title} status`}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="1">Active</option>
            <option value="0">Pending / Inactive</option>
          </select>
        )}
      </div>
      <State {...state} retry={() => setRetry((v) => v + 1)}>
        {data && (
          <>
            <div className="card table-responsive">
              <table className="table align-middle content-admin-table mb-0">
                <thead>
                  <tr>
                    <th>{config.key === "join-us" ? "S.No" : "ID"}</th>
                    {config.columns.map((key) => (
                      <th key={key}>{label(key)}</th>
                    ))}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.records.map((record, index) => (
                    <tr key={record[config.id]}>
                      <td>
                        {config.key === "join-us"
                          ? (data.page - 1) * data.limit + index + 1
                          : record[config.id]}
                      </td>
                      {config.columns.map((key) => (
                        <td
                          key={key}
                          className={
                            config.key === "join-us"
                              ? `join-us-cell-${key}`
                              : undefined
                          }
                        >
                          {config.key === "join-us" &&
                          key === "message" &&
                          record[key] ? (
                            <details className="join-us-message">
                              <summary>
                                <span>{cell(record, key)}</span>
                                <small>Read message</small>
                              </summary>
                              <p>{cell(record, key)}</p>
                            </details>
                          ) : (
                            cell(record, key)
                          )}
                        </td>
                      ))}
                      <td>
                        <div
                          className={
                            config.key === "online-papers"
                              ? "d-flex gap-1 online-paper-actions"
                              : config.key === "join-us"
                                ? "d-flex gap-1 join-us-actions"
                                : "d-flex gap-2"
                          }
                        >
                          {config.key === "online-papers" ? (
                            record.upload_manuscript ? (
                              <a
                                className="btn btn-sm btn-outline-primary"
                                aria-label={`Open PDF for submission ${record[config.id]}`}
                                href={
                                  /^https?:\/\//i.test(
                                    String(record.upload_manuscript),
                                  )
                                    ? String(record.upload_manuscript)
                                    : `/api/admin/resources/online-papers/${record[config.id]}/attachment`
                                }
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                PDF
                              </a>
                            ) : (
                              <span className="text-muted small align-self-center">
                                No PDF
                              </span>
                            )
                          ) : (
                            <Link
                              className="btn btn-sm btn-outline-secondary"
                              aria-label={`Edit ${config.singular} ${record[config.id]}`}
                              to={base + "/edit?id=" + record[config.id]}
                            >
                              Review / Edit
                            </Link>
                          )}
                          {config.key === "join-us" && record.resume_cv && (
                            <a
                              className="btn btn-sm btn-outline-primary"
                              aria-label={`Open CV for application ${record[config.id]}`}
                              href={
                                /^https?:\/\//i.test(String(record.resume_cv))
                                  ? String(record.resume_cv)
                                  : `/api/admin/resources/join-us/${record[config.id]}/attachment`
                              }
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              {/\.(doc|docx)$/i.test(String(record.resume_cv))
                                ? "CV"
                                : "PDF"}
                            </a>
                          )}
                          <button
                            className="btn btn-sm btn-outline-danger"
                            aria-label={`Delete ${config.singular} ${record[config.id]}`}
                            onClick={() => {
                              setDeleting(record);
                              setError("");
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.records.length && (
              <div className="card p-4 mt-3">
                <h2 className="h5">
                  {search || status ? "No matching records" : "No records yet"}
                </h2>
                <p>
                  {search || status
                    ? "Try another search or status."
                    : config.create
                      ? "Add the first record to get started."
                      : "New submissions will appear here."}
                </p>
              </div>
            )}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4">
              <span>
                Showing {data.total ? (page - 1) * data.limit + 1 : 0} to{" "}
                {Math.min(page * data.limit, data.total)} of {data.total}{" "}
                records
              </span>
              <div className="d-flex gap-3 align-items-center">
                <button
                  className="btn button outline small"
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Previous
                </button>
                <span>
                  Page {page} of{" "}
                  {Math.max(1, Math.ceil(data.total / data.limit))}
                </span>
                <button
                  className="btn button outline small"
                  aria-label="Next page"
                  disabled={page * data.limit >= data.total}
                  onClick={() => setPage((v) => v + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </State>
      {deleting && (
        <AdminDialog
          title={`Delete ${config.singular}?`}
          description="This permanently removes the record and any uploaded file that is no longer used. This action cannot be undone."
          onClose={() => setDeleting(null)}
          busy={busy}
        >
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            Confirm deletion of record #{deleting[config.id]}.
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
              {busy ? "Deleting..." : "Delete record"}
            </button>
          </div>
        </AdminDialog>
      )}
    </>
  );
}
