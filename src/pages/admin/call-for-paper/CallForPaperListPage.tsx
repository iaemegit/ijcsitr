"use client";
import { useEffect, useState } from "react";
import { Link, useLocation } from "../../../lib/navigation";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
import AdminDialog from "../../../components/admin/AdminDialog";
import type { CallForPaperRecord } from "./call-for-paper-types";
import "./call-for-paper.css";
type ListData = {
  calls: CallForPaperRecord[];
  total: number;
  page: number;
  limit: number;
};
export default function CallForPaperListPage() {
  const { session } = useAdmin(),
    location = useLocation();
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
    [deleting, setDeleting] = useState<CallForPaperRecord | null>(null),
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
      `/calls-for-papers?q=${encodeURIComponent(search)}&page=${page}${status ? "&status=" + status : ""}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!data.calls.length && data.total > 0 && page > 1) {
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
  }, [search, status, page, retry]);
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await adminApi("/calls-for-papers/" + deleting!.call_id, {
        method: "DELETE",
        csrfToken: session?.csrfToken,
      });
      setDeleting(null);
      setNotice("Call for papers deleted successfully.");
      setRetry((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  const data = state.data;
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / CALL FOR PAPERS</span>
          <h1>Call for Papers</h1>
          <p>
            Manage issue schedules, submission deadlines and announcement PDFs.
          </p>
        </div>
        <Link className="btn button" to="/portal/admin/call-for-paper/add">
          Add new
        </Link>
      </div>
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      <div className="cfp-toolbar">
        <input
          className="form-control"
          aria-label="Search calls for papers"
          placeholder="Search issue month, year, dispatch or deadline"
          value={input}
          maxLength={200}
          onChange={(e) => setInput(e.target.value)}
        />
        <select
          className="form-select"
          aria-label="Filter call status"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All statuses</option>
          <option value="1">Active</option>
          <option value="0">Inactive</option>
        </select>
      </div>
      <State {...state} retry={() => setRetry((v) => v + 1)}>
        {data && (
          <>
            <div className="card table-responsive">
              <table className="table align-middle cfp-table mb-0">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Issue</th>
                    <th>Deadline</th>
                    <th>Dispatch Period</th>
                    <th>Dispatch Date</th>
                    <th>File</th>
                    <th>Status</th>
                    <th>Created User ID</th>
                    <th>Updated User ID</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.calls.map((call) => (
                    <tr key={call.call_id}>
                      <td>{call.call_id}</td>
                      <td>
                        {call.issue_month} {call.issue_year}
                      </td>
                      <td>{call.deadline.slice(0, 10)}</td>
                      <td>
                        {call.dispatch_month} {call.dispatch_year}
                      </td>
                      <td>{call.dispatch_date.slice(0, 10)}</td>
                      <td>
                        {call.file &&
                        (call.file.startsWith(
                          "/api/admin/calls-for-papers/files/",
                        ) ||
                          /^https?:\/\//i.test(call.file)) ? (
                          <a href={call.file} target="_blank" rel="noreferrer">
                            Open PDF
                          </a>
                        ) : call.file ? (
                          "File saved"
                        ) : (
                          "—"
                        )}
                      </td>
                      <td>
                        <span
                          className={
                            "badge " +
                            (call.status === 1
                              ? "text-bg-success"
                              : "text-bg-secondary")
                          }
                        >
                          {call.status === 1 ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{call.created_userid ?? "—"}</td>
                      <td>{call.updated_userid ?? "—"}</td>
                      <td>
                        <div className="d-flex gap-2">
                          <Link
                            className="btn btn-sm btn-outline-secondary"
                            aria-label={`Edit call ${call.call_id}`}
                            to={`/portal/admin/call-for-paper/edit?id=${call.call_id}`}
                          >
                            Edit
                          </Link>
                          <button
                            className="btn btn-sm btn-outline-danger"
                            aria-label={`Delete call ${call.call_id}`}
                            onClick={() => {
                              setDeleting(call);
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
            {!data.calls.length && (
              <div className="card p-4 mt-3">
                <h2 className="h5">
                  {search || status
                    ? "No matching calls"
                    : "No calls for papers yet"}
                </h2>
                <p>
                  {search || status
                    ? "Try another search or status."
                    : "Add the first call for papers."}
                </p>
              </div>
            )}
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4">
              <span>
                Showing {data.total ? (page - 1) * data.limit + 1 : 0} to{" "}
                {Math.min(page * data.limit, data.total)} of {data.total} calls
              </span>
              <div className="d-flex align-items-center gap-3">
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
          title="Delete call for papers?"
          description={`Permanently delete the ${deleting.issue_month} ${deleting.issue_year} call and its uploaded PDF? This action cannot be undone.`}
          onClose={() => setDeleting(null)}
          busy={busy}
        >
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            The announcement and its dispatch schedule will be removed.
          </div>
          <div className="modal-footer">
            <button
              className="btn button outline"
              onClick={() => setDeleting(null)}
              disabled={busy}
            >
              Cancel
            </button>
            <button className="btn btn-danger" onClick={remove} disabled={busy}>
              {busy ? "Deleting..." : "Delete call"}
            </button>
          </div>
        </AdminDialog>
      )}
    </>
  );
}
