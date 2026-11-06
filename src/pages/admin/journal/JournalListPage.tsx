"use client";
import { useEffect, useState } from "react";
import { Link, useLocation } from "../../../lib/navigation";
import { BookOpen, Pencil, X } from "lucide-react";
import State from "../../../components/State";
import adminApi from "../../../services/adminApi";
import "./journal.css";
export default function JournalListPage() {
  const location = useLocation(),
    [notice, setNotice] = useState<any>(location.state?.notice || ""),
    [state, setState] = useState<any>({ loading: true }),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/journal", { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [retry]);
  const row = state.data?.journal;
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / JOURNAL</span>
          <h1>Journal</h1>
          <p>View and maintain the details of your journal.</p>
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
              <BookOpen size={18} /> Journal details
            </h2>
            <p>This application manages a single journal.</p>
          </div>
        </div>
        <State {...state} retry={() => setRetry((value) => value + 1)}>
          {row && (
            <div className="table-responsive">
              <table className="table align-middle admin-data-table journal-data-table">
                <thead>
                  <tr>
                    <th scope="col">ID</th>
                    <th scope="col">Journal title</th>
                    <th scope="col">Discipline</th>
                    <th scope="col">Start year</th>
                    <th scope="col">Status</th>
                    <th scope="col">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="admin-id">#{row.journal_id}</td>
                    <td>
                      <strong>{row.journal_name}</strong>
                      <small className="journal-key">{row.journal_key}</small>
                    </td>
                    <td>
                      {state.data.disciplines.find(
                        (item) => item.discipline_id === row.discipline_id,
                      )?.discipline_name || "Not assigned"}
                    </td>
                    <td>{row.start_year}</td>
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
                          to="/portal/admin/journal/edit"
                        >
                          <Pencil size={14} /> Edit
                        </Link>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </State>
      </section>
    </>
  );
}
