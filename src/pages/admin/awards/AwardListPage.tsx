"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Plus,
  FileSpreadsheet,
  FileText,
  Printer,
  Search,
  Pencil,
  Trash2,
  Award,
} from "lucide-react";
import { Link, useLocation } from "../../../lib/navigation";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
import AdminDialog from "../../../components/admin/AdminDialog";
import type { AwardRecord } from "./award-types";
import {
  awardColumns,
  awardCell,
  awardExportHeaders,
  awardExportRows,
  downloadAwardCsv,
  downloadAwardPdf,
} from "./award-export";
import "./award.css";
type ListData = {
  members: AwardRecord[];
  total: number;
  page: number;
  limit: number;
};
export default function AwardListPage() {
  const { session } = useAdmin(),
    location = useLocation();
  const [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0),
    [state, setState] = useState<{
      loading: boolean;
      error?: string;
      data?: ListData;
    }>({ loading: true });
  const [selected, setSelected] = useState<number[]>([]),
    [notice, setNotice] = useState(location.state?.notice || ""),
    [deleting, setDeleting] = useState<AwardRecord | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [exporting, setExporting] = useState(false),
    [exportError, setExportError] = useState(""),
    [printRows, setPrintRows] = useState<AwardRecord[] | null>(null);
  const allRef = useRef<HTMLInputElement>(null);
  const [showAudit, setShowAudit] = useState(false);
  const visibleColumns = awardColumns.filter(
    ([, key]) =>
      showAudit ||
      ![
        "created_userid",
        "created_date",
        "updated_userid",
        "updated_date",
      ].includes(key),
  );
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [input]);
  useEffect(() => {
    const controller = new AbortController();
    setSelected([]);
    setState((old) => ({ ...old, loading: true, error: undefined }));
    adminApi(`/awards?q=${encodeURIComponent(search)}&page=${page}`, {
      signal: controller.signal,
    })
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
  }, [search, page, retry]);
  useEffect(() => {
    if (allRef.current)
      allRef.current.indeterminate =
        selected.length > 0 &&
        selected.length < (state.data?.members.length || 0);
  }, [selected, state.data]);
  useEffect(() => {
    if (!printRows) return;
    const done = () => setPrintRows(null);
    window.addEventListener("afterprint", done);
    const frame = requestAnimationFrame(() => window.print());
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("afterprint", done);
    };
  }, [printRows]);
  async function remove() {
    setBusy(true);
    setError("");
    try {
      await adminApi("/awards/" + deleting!.id, {
        method: "DELETE",
        csrfToken: session?.csrfToken,
      });
      setDeleting(null);
      setNotice("Award deleted successfully.");
      setRetry((v) => v + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  async function exportData(kind: "csv" | "pdf" | "print") {
    setExporting(true);
    setExportError("");
    try {
      let members: AwardRecord[] = [];
      if (selected.length)
        members = state.data!.members.filter((member) =>
          selected.includes(member.id),
        );
      else {
        let current = 1,
          total = 0;
        do {
          const result = await adminApi(
            `/awards?q=${encodeURIComponent(search)}&page=${current}&limit=50`,
          );
          members.push(...result.members);
          total = result.total;
          current++;
          if (!result.members.length) break;
        } while (members.length < total);
      }
      if (kind === "csv") downloadAwardCsv(members);
      else if (kind === "pdf") await downloadAwardPdf(members);
      else setPrintRows(members);
    } catch (err) {
      setExportError(err.message || "Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  }
  const data = state.data,
    chosen = data?.members.find((member) => member.id === selected[0]),
    disabled = exporting || state.loading || !data?.total;
  return (
    <section
      className="award-dashboard award-dashboard-professional"
      aria-label="Awards dashboard"
    >
      <header className="award-directory-heading">
        <div>
          <span className="eyebrow muted">
            JOURNAL ADMINISTRATION / RECOGNITION
          </span>
          <h1>Awards</h1>
          <p>
            Manage award recipients, achievements, and professional profiles.
          </p>
        </div>
        <Link
          className="btn award-action award-add"
          to="/portal/admin/awards/add"
        >
          <Plus size={17} />
          Add New
        </Link>
      </header>
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      <div className="award-directory-card-heading">
        <div>
          <h2>
            Awards directory{" "}
            <span>{state.loading ? "…" : (data?.total ?? 0)}</span>
          </h2>
          <p>
            {search
              ? "Awards matching your search."
              : "Select a recipient to manage their award or export records."}
          </p>
        </div>
        <label className="award-audit-toggle">
          <input
            className="form-check-input"
            type="checkbox"
            checked={showAudit}
            onChange={(event) => setShowAudit(event.target.checked)}
          />
          Show audit columns
        </label>
      </div>
      <div className="award-dashboard-toolbar">
        <div className="award-dashboard-buttons">
          <button
            className="btn award-action award-csv"
            disabled={disabled}
            onClick={() => exportData("csv")}
          >
            <FileSpreadsheet size={16} />
            Export CSV
          </button>
          <button
            className="btn award-action award-pdf"
            disabled={disabled}
            onClick={() => exportData("pdf")}
          >
            <FileText size={16} />
            Export PDF
          </button>
          <button
            className="btn award-action award-print"
            disabled={disabled}
            onClick={() => exportData("print")}
          >
            <Printer size={16} />
            Print
          </button>
          {selected.length === 1 && chosen && (
            <>
              <Link
                className="btn award-action award-edit"
                aria-label={`Edit award ${chosen.id}`}
                to={`/portal/admin/awards/edit?id=${chosen.id}`}
              >
                <Pencil size={16} />
                Edit
              </Link>
              <button
                className="btn award-action award-delete"
                aria-label={`Delete award ${chosen.id}`}
                onClick={() => {
                  setDeleting(chosen);
                  setError("");
                }}
              >
                <Trash2 size={16} />
                Delete
              </button>
            </>
          )}
        </div>
        <div className="award-dashboard-search">
          <Search size={17} />
          <input
            className="form-control"
            aria-label="Search awards"
            placeholder="Search by name, award type, or email"
            value={input}
            maxLength={200}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>
      </div>
      {selected.length > 0 && (
        <p className="award-selection-note">
          {selected.length} selected. Exports and print include selected rows.{" "}
          <button
            className="btn btn-link btn-sm"
            onClick={() => setSelected([])}
          >
            Clear selection
          </button>
        </p>
      )}
      {exportError && (
        <div className="alert alert-danger" role="alert">
          {exportError}
        </div>
      )}
      <State {...state} retry={() => setRetry((v) => v + 1)}>
        {data && (
          <>
            <div className="award-dashboard-table-wrap table-responsive">
              <table className="table align-middle award-dashboard-table mb-0">
                <thead>
                  <tr>
                    <th>
                      <input
                        ref={allRef}
                        type="checkbox"
                        className="form-check-input"
                        aria-label="Select all awards on this page"
                        disabled={!data.members.length}
                        checked={
                          !!data.members.length &&
                          selected.length === data.members.length
                        }
                        onChange={(event) =>
                          setSelected(
                            event.target.checked
                              ? data.members.map((member) => member.id)
                              : [],
                          )
                        }
                      />
                    </th>
                    <th>S.No</th>
                    {visibleColumns.map(([label, key]) => (
                      <th key={key}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((member, index) => (
                    <tr
                      key={member.id}
                      className={
                        selected.includes(member.id) ? "award-row-selected" : ""
                      }
                    >
                      <td>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          aria-label={`Select award ${member.id}`}
                          checked={selected.includes(member.id)}
                          onChange={(event) =>
                            setSelected((old) =>
                              event.target.checked
                                ? [...old, member.id]
                                : old.filter((id) => id !== member.id),
                            )
                          }
                        />
                      </td>
                      <td>{(page - 1) * data.limit + index + 1}</td>
                      {visibleColumns.map(([, key]) => (
                        <td key={key}>
                          {key === "name" ? (
                            <Link
                              aria-label={`Edit award ${member.id}`}
                              to={`/portal/admin/awards/edit?id=${member.id}`}
                            >
                              <span
                                className="award-recipient-avatar"
                                aria-hidden="true"
                              >
                                {String(member.name || "?")
                                  .trim()
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </span>
                              <span className="award-recipient-name">
                                {awardCell(member, key) || "—"}
                              </span>
                            </Link>
                          ) : key === "status" ? (
                            <span
                              className={
                                "award-status-pill " +
                                (member.status === 1
                                  ? "is-active"
                                  : "is-inactive")
                              }
                            >
                              {awardCell(member, key)}
                            </span>
                          ) : key === "content" || key === "affiliation" ? (
                            <span
                              className="award-cell-excerpt"
                              title={awardCell(member, key)}
                            >
                              {awardCell(member, key) || "—"}
                            </span>
                          ) : (
                            awardCell(member, key) || "—"
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!data.members.length && (
              <div className="award-directory-empty" role="status">
                <span className="award-empty-icon">
                  <Award size={28} />
                </span>
                <h3>{search ? "No matching awards" : "No awards yet"}</h3>
                <p>
                  {search
                    ? "Try a different recipient name, award type, or email."
                    : "Create an award to recognize a recipient’s achievements."}
                </p>
                {search ? (
                  <button
                    className="btn button outline small"
                    onClick={() => setInput("")}
                  >
                    Clear search
                  </button>
                ) : (
                  <Link
                    className="btn button small"
                    to="/portal/admin/awards/add"
                  >
                    Add your first award
                  </Link>
                )}
              </div>
            )}
            <div className="award-dashboard-pagination">
              <span>
                Showing {data.total ? (page - 1) * data.limit + 1 : 0} to{" "}
                {Math.min(page * data.limit, data.total)} of {data.total} awards
              </span>
              <div>
                <button
                  className="btn"
                  aria-label="Previous page"
                  disabled={page === 1}
                  onClick={() => setPage((v) => v - 1)}
                >
                  Previous
                </button>
                <span
                  className="award-page-number"
                  aria-label={`Page ${page} of ${Math.max(1, Math.ceil(data.total / data.limit))}`}
                >
                  {page}
                </span>
                <button
                  className="btn"
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
          title="Delete award?"
          description={`Permanently delete the award for ${deleting.name || "this recipient"}? This action cannot be undone.`}
          onClose={() => setDeleting(null)}
          busy={busy}
        >
          <div className="modal-body">
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            The recipient’s award details will be removed.
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
              {busy ? "Deleting..." : "Delete award"}
            </button>
          </div>
        </AdminDialog>
      )}
      {printRows &&
        createPortal(
          <div className="award-print-sheet">
            <h1>IJCSITR — Awards</h1>
            <table>
              <thead>
                <tr>
                  {awardExportHeaders.map((label) => (
                    <th key={label}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {awardExportRows(printRows).map((row, index) => (
                  <tr key={index}>
                    {row.map((value, column) => (
                      <td key={column}>{value}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>,
          document.body,
        )}
    </section>
  );
}
