"use client";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "../../../lib/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Layers3,
  LoaderCircle,
  Pencil,
  Search,
  Trash2,
  X,
} from "lucide-react";
import State from "../../../components/State";
import Empty from "../../../components/Empty";
import AdminDialog from "../../../components/admin/AdminDialog";
import adminApi from "../../../services/adminApi";
import { useAdmin } from "../../../context/AdminContext";
function date(value) {
  return value
    ? new Date(value.replace(" ", "T")).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";
}
export default function DisciplineListPage() {
  const { session } = useAdmin(),
    location = useLocation(),
    navigate = useNavigate();
  const [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [refresh, setRefresh] = useState(0),
    [state, setState] = useState<any>({ loading: true }),
    [deleting, setDeleting] = useState<any>(null),
    [deleteBusy, setDeleteBusy] = useState(false),
    [deleteError, setDeleteError] = useState(""),
    [notice, setNotice] = useState<any>(location.state?.notice || "");
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
    setState((old) => ({ ...old, loading: true, error: null }));
    adminApi(`/disciplines?q=${encodeURIComponent(search)}&page=${page}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (data.disciplines.length === 0 && data.total > 0 && page > 1) {
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
  }, [search, page, refresh]);
  async function remove() {
    setDeleteBusy(true);
    setDeleteError("");
    try {
      await adminApi("/disciplines/" + deleting.discipline_id, {
        method: "DELETE",
        csrfToken: session?.csrfToken,
      });
      setDeleting(null);
      setNotice("Discipline deleted successfully.");
      setRefresh((value) => value + 1);
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeleteBusy(false);
    }
  }
  const total = state.data?.total || 0,
    pages = Math.max(1, Math.ceil(total / 10));
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / DISCIPLINE</span>
          <h1>Discipline</h1>
          <p>Manage your journal’s research disciplines and departments.</p>
        </div>
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
              <Layers3 size={18} /> All disciplines{" "}
              <span className="badge">{total}</span>
            </h2>
            <p>View, edit, and maintain discipline records.</p>
          </div>
          <div className="admin-table-search">
            <Search size={18} />
            <input
              className="form-control"
              aria-label="Search disciplines"
              placeholder="Search by name, department, or ID…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
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
        <State {...state} retry={() => setRefresh((value) => value + 1)}>
          {state.data?.disciplines.length ? (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle admin-data-table">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Discipline name</th>
                      <th scope="col">Department</th>
                      <th scope="col">Status</th>
                      <th scope="col">Created</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.disciplines.map((row) => (
                      <tr key={row.discipline_id}>
                        <td className="admin-id">#{row.discipline_id}</td>
                        <td>
                          <strong>
                            {row.discipline_name || "Untitled discipline"}
                          </strong>
                          {row.journal_count > 0 && (
                            <small className="discipline-used">
                              Used by {row.journal_count}{" "}
                              {row.journal_count === 1 ? "journal" : "journals"}
                            </small>
                          )}
                        </td>
                        <td>
                          {row.department || (
                            <span className="admin-empty-value">
                              Not specified
                            </span>
                          )}
                        </td>
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
                        <td className="admin-date">{date(row.created_date)}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button
                              className="btn admin-edit-button"
                              aria-label={`Edit ${row.discipline_name || "discipline " + row.discipline_id}`}
                              onClick={() => {
                                navigate(
                                  "/portal/admin/discipline/edit?id=" +
                                    row.discipline_id,
                                );
                              }}
                            >
                              <Pencil size={14} />
                              <span>Edit</span>
                            </button>
                            <button
                              className="btn admin-delete-button"
                              disabled
                              aria-label={`Delete ${row.discipline_name || "discipline " + row.discipline_id}`}
                              title="Delete discipline"
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
              title={search ? "No matching disciplines" : "No disciplines yet"}
              text={
                search
                  ? "Try another search term, or clear the search."
                  : "The journal currently has no discipline details."
              }
              action={
                search ? (
                  <button
                    className="btn button outline"
                    onClick={() => setInput("")}
                  >
                    Clear search
                  </button>
                ) : null
              }
            />
          )}
        </State>
      </section>
      <p className="admin-table-note">
        Deleting the discipline removes its details from the journal.
      </p>
      {deleting && (
        <AdminDialog
          title="Delete discipline?"
          description="If you delete this discipline, the journal will no longer have discipline details."
          onClose={() => setDeleting(null)}
          busy={deleteBusy}
        >
          <div className="modal-body">
            <p className="admin-delete-description">
              Delete <strong>{deleting.discipline_name}</strong>? This action
              cannot be undone.
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
              disabled={deleteBusy}
              onClick={() => setDeleting(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-danger"
              disabled={deleteBusy}
              onClick={remove}
            >
              {deleteBusy ? (
                <LoaderCircle size={16} className="spin" />
              ) : (
                <Trash2 size={16} />
              )}{" "}
              {deleteBusy ? "Deleting…" : "Delete discipline"}
            </button>
          </div>
        </AdminDialog>
      )}
    </>
  );
}
