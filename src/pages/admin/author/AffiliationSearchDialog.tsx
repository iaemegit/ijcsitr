"use client";
import affiliationLabel from "../../../utils/affiliationLabel";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import AdminDialog from "../../../components/admin/AdminDialog";
import adminApi from "../../../services/adminApi";
const key = (item) => item.aff_id ?? "legacy";
export default function AffiliationSearchDialog({
  query: initialQuery,
  affiliations,
  primary,
  onApply,
  onClose,
}) {
  const [query, setQuery] = useState<any>(initialQuery),
    [draft, setDraft] = useState<any>(() =>
      affiliations.map((item) => ({ ...item })),
    ),
    [primaryId, setPrimaryId] = useState<any>(primary?.aff_id ?? "legacy"),
    [state, setState] = useState<any>({ loading: true }),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState((old) => ({ ...old, loading: true, error: null }));
    const timer = setTimeout(() => {
      adminApi(
        "/affiliations?q=" + encodeURIComponent(query.trim()) + "&page=" + page,
        { signal: controller.signal },
      )
        .then((data) => setState({ data, loading: false }))
        .catch((error) => {
          if (error.name !== "AbortError")
            setState({ error: error.message, loading: false });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, page, retry]);
  function toggle(item, checked) {
    const next = checked
      ? [...draft.filter((value) => value.aff_id), { ...item, department: "" }]
      : draft.filter((value) => key(value) !== key(item));
    setDraft(next);
    if (!next.some((value) => key(value) === primaryId))
      setPrimaryId(next.length ? key(next[0]) : null);
  }
  return createPortal(
    <AdminDialog
      title="Select affiliations"
      description="Select one or more affiliations, then mark one as Primary."
      onClose={onClose}
    >
      <div className="modal-body author-affiliation-popup">
        <label className="form-label" htmlFor="affiliation-popup-search">
          Search affiliations
        </label>
        <div className="input-group">
          <span className="input-group-text">
            <Search size={17} />
          </span>
          <input
            id="affiliation-popup-search"
            className="form-control"
            value={query}
            placeholder="Search by name, ID, university or address"
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(1);
            }}
            maxLength={200}
            autoFocus
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                setRetry((value) => value + 1);
              }
            }}
          />
        </div>
        {draft.length > 0 && (
          <section
            className="author-popup-selection"
            aria-label="Selected affiliations"
          >
            <h3>{draft.length} selected · Choose the primary affiliation</h3>
            {draft.map((item) => (
              <label
                className={
                  "author-primary-choice " +
                  (key(item) === primaryId ? "is-primary" : "")
                }
                key={key(item)}
              >
                <input
                  type="radio"
                  name="primary-affiliation"
                  className="form-check-input"
                  checked={key(item) === primaryId}
                  onChange={() => setPrimaryId(key(item))}
                  aria-label={"Primary affiliation: " + affiliationLabel(item)}
                />
                <span>{affiliationLabel(item)}</span>
                <b>{key(item) === primaryId ? "Primary" : "Make primary"}</b>
              </label>
            ))}
          </section>
        )}
        <div className="author-popup-results" aria-busy={state.loading}>
          {state.loading ? (
            <div className="load-state">
              <LoaderCircle className="spin" size={22} />
              <span>Searching affiliations…</span>
            </div>
          ) : state.error ? (
            <div className="alert alert-danger" role="alert">
              {state.error}
              <button
                className="btn btn-link"
                type="button"
                onClick={() => setRetry((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <div className="author-popup-count">
                {state.data?.total || 0} affiliations found
              </div>
              {state.data?.affiliations.map((item) => (
                <label
                  className="author-affiliation-checkbox"
                  key={item.aff_id}
                  data-affiliation-id={item.aff_id}
                >
                  <input
                    type="checkbox"
                    className="form-check-input"
                    aria-label={"Select " + affiliationLabel(item)}
                    checked={draft.some(
                      (value) => value.aff_id === item.aff_id,
                    )}
                    onChange={(event) => toggle(item, event.target.checked)}
                  />
                  <span>
                    <strong>{affiliationLabel(item)}</strong>
                    <small>{item.address}</small>
                    <small>
                      {item.country} ({item.aff_id})
                    </small>
                  </span>
                </label>
              ))}
              {!state.data?.total && (
                <p className="p-3">
                  No matching affiliations. Try another name or address.
                </p>
              )}
              {(state.data?.total || 0) > 10 && (
                <div className="author-popup-pagination">
                  <button
                    className="btn button outline"
                    type="button"
                    disabled={page <= 1}
                    onClick={() => setPage((value) => value - 1)}
                  >
                    Previous
                  </button>
                  <span>
                    Page {page} of {Math.ceil(state.data.total / 10)}
                  </span>
                  <button
                    className="btn button outline"
                    type="button"
                    disabled={page >= Math.ceil(state.data.total / 10)}
                    onClick={() => setPage((value) => value + 1)}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        {draft.length > 20 && (
          <p className="text-danger" role="alert">
            Select up to 20 affiliations.
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn button outline" onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          className="btn button"
          disabled={
            !draft.length ||
            draft.length > 20 ||
            !draft.some((item) => key(item) === primaryId)
          }
          onClick={() => onApply(draft, primaryId)}
        >
          Use selected affiliations
        </button>
      </div>
    </AdminDialog>,
    document.body,
  );
}
