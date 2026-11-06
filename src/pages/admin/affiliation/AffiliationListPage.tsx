"use client";
import { useEffect, useState } from "react";
import { Link, useLocation } from "../../../lib/navigation";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
  TriangleAlert,
} from "lucide-react";
import State from "../../../components/State";
import Empty from "../../../components/Empty";
import AdminDialog from "../../../components/admin/AdminDialog";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import "./affiliation.css";
import affiliationLabel from "../../../utils/affiliationLabel";
import AffiliationLinksTable from "./AffiliationLinksTable";
import type { AffiliationAuthorLink } from "../../../../server/affiliation-links";
export default function AffiliationListPage() {
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
  const [links, setLinks] = useState<{
    authors: AffiliationAuthorLink[];
    can_delete: boolean;
  } | null>(null);
  const [checking, setChecking] = useState(false);
  const [linkError, setLinkError] = useState("");
  useEffect(() => {
    if (!deleting) return;
    const controller = new AbortController();
    setChecking(true);
    setLinks(null);
    setLinkError("");
    adminApi(`/affiliations/${deleting.aff_id}/links`, {
      signal: controller.signal,
    })
      .then((data) => {
        setLinks(data);
        setChecking(false);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setLinkError(error.message);
          setChecking(false);
        }
      });
    return () => controller.abort();
  }, [deleting]);
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
    adminApi(`/affiliations?q=${encodeURIComponent(search)}&page=${page}`, {
      signal: controller.signal,
    })
      .then((data) => {
        if (!data.affiliations.length && data.total > 0 && page > 1) {
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
      await adminApi("/affiliations/" + deleting.aff_id, {
        method: "DELETE",
        csrfToken: session?.csrfToken,
      });
      setDeleting(null);
      setNotice("Affiliation deleted successfully.");
      setRetry((value) => value + 1);
    } catch (error) {
      setDeleteError(error.message);
      if (error.status === 409) {
        try {
          setLinks(await adminApi(`/affiliations/${deleting.aff_id}/links`));
          setRetry((value) => value + 1);
        } catch {
          setLinks(null);
          setLinkError(
            "Could not refresh affiliation links. Close this popup and try again.",
          );
        }
      }
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
          <span className="eyebrow muted">FORMS / AFFILIATION</span>
          <h1>Affiliation</h1>
          <p>
            Manage institutions and organizations connected with your journal.
          </p>
        </div>
        <Link className="btn button" to="/portal/admin/affiliation/add">
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
              <Building2 size={18} /> All affiliations{" "}
              <span className="badge">{total}</span>
            </h2>
            <p>View, edit, and maintain affiliation records.</p>
          </div>
          <div className="admin-table-search admin-affiliation-search">
            <Search size={18} />
            <input
              className="form-control"
              aria-label="Search affiliations"
              placeholder="Search name, code, country, address, or ID…"
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
          {state.data?.affiliations.length ? (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle admin-data-table affiliation-data-table">
                  <thead>
                    <tr>
                      <th scope="col">ID</th>
                      <th scope="col">Affiliation name</th>
                      <th scope="col">Code</th>
                      <th scope="col">Country</th>
                      <th scope="col">Connected authors</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {state.data.affiliations.map((row) => (
                      <tr key={row.aff_id}>
                        <td className="admin-id">#{row.aff_id}</td>
                        <td>
                          <strong>{affiliationLabel(row)}</strong>
                          {row.alternate_name && (
                            <small className="affiliation-address">
                              {row.alternate_name}
                            </small>
                          )}
                          <small className="affiliation-address">
                            {row.address}
                          </small>
                        </td>
                        <td className="affiliation-code">
                          {row.aff_code || "—"}
                        </td>
                        <td className="affiliation-country">{row.country}</td>
                        <td>{row.author_count ?? 0}</td>
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
                                "/portal/admin/affiliation/edit?id=" +
                                row.aff_id
                              }
                              aria-label={"Edit " + affiliationLabel(row)}
                            >
                              <Pencil size={14} />
                              <span>Edit</span>
                            </Link>
                            <button
                              className={
                                row.author_count
                                  ? "btn btn-outline-warning"
                                  : "btn admin-delete-button"
                              }
                              aria-label={
                                (row.author_count
                                  ? "View links for "
                                  : "Delete ") + affiliationLabel(row)
                              }
                              onClick={() => {
                                setDeleteError("");
                                setDeleting(row);
                              }}
                            >
                              {row.author_count ? (
                                <TriangleAlert size={14} />
                              ) : (
                                <Trash2 size={14} />
                              )}
                              <span>
                                {row.author_count ? "View links" : "Delete"}
                              </span>
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
              title={
                search ? "No matching affiliations" : "No affiliations yet"
              }
              text={
                search
                  ? "Try another search term or clear the search."
                  : "Add an institution or organization to get started."
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
                  <Link
                    className="btn button"
                    to="/portal/admin/affiliation/add"
                  >
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
          title={
            links && !links.can_delete
              ? "Affiliation is in use"
              : checking || !links
                ? "Check affiliation links"
                : "Delete affiliation?"
          }
          description={
            links && !links.can_delete
              ? "Linked affiliations cannot be deleted."
              : "Check related authors and articles before removing this affiliation."
          }
          busy={busy}
          onClose={() => setDeleting(null)}
        >
          <div className="modal-body">
            {checking ? (
              <p role="status">Checking linked authors and articles...</p>
            ) : linkError ? (
              <div className="alert alert-danger" role="alert">
                {linkError}
              </div>
            ) : links && !links.can_delete ? (
              <>
                <div className="alert alert-warning" role="alert">
                  <strong>{affiliationLabel(deleting)}</strong> is connected to
                  the authors below and their articles. This affiliation cannot
                  be deleted.
                </div>
                <AffiliationLinksTable authors={links.authors} />
              </>
            ) : (
              links && (
                <p className="admin-delete-description">
                  Are you sure you want to delete{" "}
                  <strong>{affiliationLabel(deleting)}</strong>? This action
                  cannot be undone.
                </p>
              )
            )}
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
              {links && !links.can_delete ? "Close" : "Cancel"}
            </button>
            {links?.can_delete && !checking && !linkError && (
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={remove}
              >
                {busy ? (
                  <LoaderCircle className="spin" size={16} />
                ) : (
                  <Trash2 size={16} />
                )}{" "}
                {busy ? "Deleting…" : "Delete affiliation"}
              </button>
            )}
          </div>
        </AdminDialog>
      )}
    </>
  );
}
