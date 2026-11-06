"use client";
import { useEffect, useRef, useState } from "react";
import adminApi from "../../../services/adminApi";
import { articleAuthorName, type ArticleAuthor } from "./article-types";
export default function ArticleAuthorPicker({
  selected,
  onChange,
  disabled,
  error,
  corresponding,
  onCorresponding,
}: {
  selected: ArticleAuthor[];
  onChange: (authors: ArticleAuthor[]) => void;
  disabled: boolean;
  error?: string;
  corresponding: string;
  onCorresponding: (id: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!open) return;
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.current?.close();
      document.body.style.overflow = overflow;
    };
  }, [open]);
  const [input, setInput] = useState(""),
    [search, setSearch] = useState(""),
    [page, setPage] = useState(1),
    [retry, setRetry] = useState(0);
  const [state, setState] = useState<{
    authors: ArticleAuthor[];
    total: number;
    loading: boolean;
    error: string;
  }>({ authors: [], total: 0, loading: true, error: "" });
  useEffect(() => {
    if (input.trim() === search) return;
    const timer = setTimeout(() => {
      setSearch(input.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(timer);
  }, [input, search]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setState((old) => ({ ...old, loading: true, error: "" }));
    adminApi(`/authors?q=${encodeURIComponent(search)}&page=${page}&limit=8`, {
      signal: controller.signal,
    })
      .then((data) =>
        setState({
          authors: data.authors,
          total: data.total,
          loading: false,
          error: "",
        }),
      )
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({
            authors: [],
            total: 0,
            loading: false,
            error: error.message,
          });
      });
    return () => controller.abort();
  }, [open, search, page, retry]);
  function move(index: number, offset: number) {
    const next = [...selected];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }
  return (
    <div className="article-author-picker">
      <span className="form-label d-block">Authors *</span>
      <button
        type="button"
        className="btn btn-primary article-author-search-button"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Search Authors
      </button>
      {open && (
        <dialog
          ref={dialog}
          className="article-author-dialog"
          aria-labelledby="article-author-dialog-title"
          onCancel={() => setOpen(false)}
          onClose={() => setOpen(false)}
        >
          <div className="article-author-dialog-heading">
            <h3 id="article-author-dialog-title">Select Authors</h3>
            <button
              type="button"
              className="btn-close"
              aria-label="Close author search"
              onClick={() => setOpen(false)}
            />
          </div>
          <label className="form-label" htmlFor="article-author-search">
            Search author name, institution or ID
          </label>
          <input
            id="article-author-search"
            className="form-control"
            placeholder="Search author name, institution or ID"
            value={input}
            maxLength={200}
            onChange={(event) => setInput(event.target.value)}
            disabled={disabled}
            autoFocus
          />
          <div className="article-author-results" aria-busy={state.loading}>
            {state.loading ? (
              <p role="status">Searching authors...</p>
            ) : state.error ? (
              <div role="alert">
                {state.error}
                <button
                  type="button"
                  className="btn btn-link"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  Try again
                </button>
              </div>
            ) : state.authors.length ? (
              state.authors.map((author) => (
                <label className="article-author-option" key={author.author_id}>
                  <input
                    type="checkbox"
                    className="form-check-input"
                    aria-label={`Select author ${author.author_id}: ${articleAuthorName(author)}`}
                    checked={selected.some(
                      (item) => item.author_id === author.author_id,
                    )}
                    disabled={disabled}
                    onChange={(event) =>
                      onChange(
                        event.target.checked
                          ? [...selected, author]
                          : selected.filter(
                              (item) => item.author_id !== author.author_id,
                            ),
                      )
                    }
                  />
                  <span>
                    <strong>{articleAuthorName(author)}</strong>
                    <small>
                      #{author.author_id}{" "}
                      {author.university || author.country || ""}
                    </small>
                  </span>
                </label>
              ))
            ) : (
              <p>No matching authors. Add an author first if needed.</p>
            )}
          </div>
          <div className="article-author-pagination">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              aria-label="Previous authors"
              disabled={disabled || state.loading || page === 1}
              onClick={() => setPage((value) => value - 1)}
            >
              Previous
            </button>
            <span>
              Page {page} of {Math.max(1, Math.ceil(state.total / 8))}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              aria-label="Next authors"
              disabled={
                disabled || state.loading || page >= Math.ceil(state.total / 8)
              }
              onClick={() => setPage((value) => value + 1)}
            >
              Next
            </button>
          </div>
          <div className="article-author-dialog-footer">
            <span>{selected.length} selected</span>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setOpen(false)}
            >
              Done
            </button>
          </div>
        </dialog>
      )}
      {selected.length > 0 && (
        <div className="article-chosen-authors">
          <h3>Selected Authors ({selected.length})</h3>
          <div className="table-responsive">
            <table className="table align-middle article-selected-table">
              <thead>
                <tr>
                  <th>Author Name</th>
                  <th>Department</th>
                  <th>University</th>
                  <th>Corresponding</th>
                  <th>Order / Action</th>
                </tr>
              </thead>
              <tbody>
                {selected.map((author, index) => (
                  <tr key={author.author_id}>
                    <td>
                      {articleAuthorName(author)}
                      <small className="d-block text-muted">
                        #{author.author_id}
                      </small>
                    </td>
                    <td>{author.department || "—"}</td>
                    <td>{author.university || author.country || "—"}</td>
                    <td>
                      <input
                        type="radio"
                        className="form-check-input"
                        name="article-corresponding"
                        aria-label={`Corresponding author ${author.author_id}`}
                        checked={corresponding === String(author.author_id)}
                        disabled={disabled}
                        onChange={() =>
                          onCorresponding(String(author.author_id))
                        }
                      />
                    </td>
                    <td>
                      <div className="d-flex gap-1">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={disabled || index === 0}
                          aria-label={`Move author ${author.author_id} up`}
                          onClick={() => move(index, -1)}
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          disabled={disabled || index === selected.length - 1}
                          aria-label={`Move author ${author.author_id} down`}
                          onClick={() => move(index, 1)}
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm text-danger"
                          disabled={disabled}
                          aria-label={`Remove author ${author.author_id}`}
                          onClick={() =>
                            onChange(
                              selected.filter(
                                (item) => item.author_id !== author.author_id,
                              ),
                            )
                          }
                        >
                          Remove
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {corresponding && (
            <button
              type="button"
              className="btn btn-sm btn-link"
              onClick={() => onCorresponding("")}
              disabled={disabled}
            >
              Clear corresponding author
            </button>
          )}
          <p className="article-field-hint">
            Publication order — use the arrows to reorder authors.
          </p>
        </div>
      )}
      {error && (
        <div className="text-danger small" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
