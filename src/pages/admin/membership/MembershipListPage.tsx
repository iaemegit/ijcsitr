"use client";
import { useEffect, useState } from "react";
import { Link, useLocation } from "../../../lib/navigation";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
import AdminDialog from "../../../components/admin/AdminDialog";
import type { MembershipMember } from "./membership-types";
import "./membership.css";
type ListData = {
  members: MembershipMember[];
  total: number;
  page: number;
  limit: number;
};
export default function MembershipListPage() {
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
    [deleting, setDeleting] = useState<MembershipMember | null>(null),
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
      `/memberships?q=${encodeURIComponent(search)}&page=${page}${status ? "&status=" + status : ""}`,
      { signal: controller.signal },
    )
      .then((data) => {
        if (!data.members.length && data.total > 0 && page > 1) {
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
      await adminApi("/memberships/" + deleting!.membership_id, {
        method: "DELETE",
        csrfToken: session?.csrfToken,
      });
      setDeleting(null);
      setNotice("Membership deleted successfully.");
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
          <span className="eyebrow muted">FORMS / MEMBERSHIP</span>
          <h1>Membership</h1>
          <p>Manage members, membership years and academic profiles.</p>
        </div>
        <Link className="btn button" to="/portal/admin/membership/add">
          Add new
        </Link>
      </div>
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      <div className="membership-toolbar">
        <input
          className="form-control"
          aria-label="Search memberships"
          placeholder="Search name, type, year, institution or email"
          value={input}
          maxLength={200}
          onChange={(e) => setInput(e.target.value)}
        />
        <select
          className="form-select"
          aria-label="Filter membership status"
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
            {data.members.length ? (
              <div className="card table-responsive">
                <table className="table align-middle membership-table mb-0">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Name</th>
                      <th>Affiliation</th>
                      <th>Membership Type</th>
                      <th>Year</th>
                      <th>Email</th>
                      <th>Mobile Number</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.members.map((member) => (
                      <tr key={member.membership_id}>
                        <td>{member.membership_id}</td>
                        <td>{member.name || "—"}</td>
                        <td>{member.affiliation || "—"}</td>
                        <td>{member.membership_type || "—"}</td>
                        <td>{member.membership_year || "—"}</td>
                        <td>{member.email || "—"}</td>
                        <td>{member.mobile_number || "—"}</td>
                        <td>
                          <span
                            className={
                              "badge " +
                              (member.status === 1
                                ? "text-bg-success"
                                : "text-bg-secondary")
                            }
                          >
                            {member.status === 1
                              ? "Active"
                              : member.status === 0
                                ? "Inactive"
                                : "Not set"}
                          </span>
                        </td>
                        <td>
                          <div className="d-flex gap-2">
                            <Link
                              className="btn btn-sm btn-outline-secondary"
                              aria-label={`Edit membership ${member.membership_id}`}
                              to={`/portal/admin/membership/edit?id=${member.membership_id}`}
                            >
                              Edit
                            </Link>
                            <button
                              className="btn btn-sm btn-outline-danger"
                              aria-label={`Delete membership ${member.membership_id}`}
                              onClick={() => {
                                setDeleting(member);
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
            ) : (
              <div className="card p-4">
                <h2 className="h5">
                  {search || status
                    ? "No matching memberships"
                    : "No memberships yet"}
                </h2>
                <p>
                  {search || status
                    ? "Try another search or status."
                    : "Add your first membership."}
                </p>
              </div>
            )}
            {data.total > 0 && (
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4">
                <span>
                  Showing {(page - 1) * data.limit + 1} to{" "}
                  {Math.min(page * data.limit, data.total)} of {data.total}{" "}
                  memberships
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
            )}
          </>
        )}
      </State>
      {deleting && (
        <AdminDialog
          title="Delete membership?"
          description={`Permanently delete the membership for ${deleting.name || "this member"}? This action cannot be undone.`}
          onClose={() => setDeleting(null)}
          busy={busy}
        >
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            The member’s membership details will be removed.
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
              {busy ? "Deleting..." : "Delete membership"}
            </button>
          </div>
        </AdminDialog>
      )}
    </>
  );
}
