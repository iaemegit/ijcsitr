"use client";
import { useState } from "react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import ArticleAuthorPicker from "./ArticleAuthorPicker";
import ArticleDocumentField, {
  type ArticleUpload,
} from "./ArticleDocumentField";
import JournalRichTextEditor from "../journal/JournalRichTextEditor";
import "../journal/journal.css";
import {
  articlePdfDisplayLink,
  type ArticleAuthor,
  type ArticleRecord,
  type ArticleOptions,
} from "./article-types";
import { Link } from "../../../lib/navigation";
import "./article.css";
export default function ArticleForm({
  article,
  options,
  onSaved,
  onCancel,
}: {
  article?: ArticleRecord;
  options: ArticleOptions;
  onSaved: (notice: string) => void;
  onCancel: () => void;
}) {
  const { session } = useAdmin();
  const [values, setValues] = useState(() => ({
    article_title: article?.article_title || "",
    article_key: article?.article_key || "",
    issue_id: article?.issue_id ? String(article.issue_id) : "",
    corresponding_author: article?.corresponding_author || "",
    abstract: article?.abstract || "",
    keywords: article?.keywords || "",
    reference: article?.reference || "",
    doi: article?.doi || "",
    google_scholar: article?.google_scholar || "",
    article_file: article?.article_file || "",
    article_word_file: article?.article_word_file || "",
    date_of_publication: article?.date_of_publication?.slice(0, 10) || "",
    date_of_received: article?.date_of_received?.slice(0, 10) || "",
    date_of_acceptance: article?.date_of_acceptance?.slice(0, 10) || "",
    page_from: article?.page_from || "",
    page_to: article?.page_to || "",
    status: article
      ? article.status == null
        ? ""
        : String(article.status)
      : "0",
  }));
  const [authors, setAuthors] = useState<ArticleAuthor[]>(
      article?.authors || [],
    ),
    [pdfUpload, setPdfUpload] = useState<ArticleUpload | null>(null),
    [wordUpload, setWordUpload] = useState<ArticleUpload | null>(null),
    [uploadsBusy, setUploadsBusy] = useState({ pdf: false, word: false }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string[]>>({});
  const [volume, setVolume] = useState(article?.volume || "");
  const selectedIssue = options.issues.find(
    (issue) => String(issue.issue_id) === values.issue_id,
  );
  const volumes = [
    ...new Set(options.issues.map((issue) => issue.volume_no)),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  type Key = keyof typeof values;
  function change(key: Key, value: string) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFields({});
    if (uploadsBusy.pdf || uploadsBusy.word) {
      setError("Wait for the file upload to finish.");
      return;
    }
    if (!pdfUpload && !values.article_file) {
      setError("Upload the PDF before saving the article.");
      return;
    }
    if (
      !values.issue_id &&
      (!article || article.issue_id || volume !== article.volume)
    ) {
      setError("Select a journal issue for the chosen volume.");
      return;
    }
    if (!authors.length) {
      setError("Select at least one article author.");
      return;
    }
    const abstractText =
      new DOMParser()
        .parseFromString(values.abstract, "text/html")
        .body.textContent?.trim() || "";
    if (abstractText.length < 10) {
      setError("Enter an abstract of at least 10 characters.");
      return;
    }
    setBusy(true);
    try {
      const data = {
        ...values,
        pdf_upload_token: pdfUpload?.token,
        word_upload_token: wordUpload?.token,
        issue_id: values.issue_id ? Number(values.issue_id) : null,
        author_ids: authors.map((author) => author.author_id),
        status: values.status === "" ? null : Number(values.status),
      };
      await adminApi("/articles" + (article ? "/" + article.article_id : ""), {
        method: article ? "PUT" : "POST",
        csrfToken: session?.csrfToken,
        body: JSON.stringify(data),
      });
      onSaved(`Article ${article ? "updated" : "created"} successfully.`);
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }
  function input(
    key: Key,
    label: string,
    required = false,
    type = "text",
    full = false,
    placeholder = "",
  ) {
    return (
      <div className={full ? "col-12" : "col-md-6"} key={key}>
        <label className="form-label" htmlFor={"article-" + key}>
          {label}
          {required ? " *" : ""}
        </label>
        <input
          id={"article-" + key}
          type={type}
          className={"form-control " + (fields[key] ? "is-invalid" : "")}
          value={values[key]}
          onChange={(event) => change(key, event.target.value)}
          required={required}
          maxLength={255}
          disabled={busy}
          placeholder={placeholder}
        />
        {fields[key] && (
          <div className="invalid-feedback">{fields[key].join(" ")}</div>
        )}
      </div>
    );
  }
  const legacyCorresponding =
    values.corresponding_author &&
    !authors.some(
      (author) => String(author.author_id) === values.corresponding_author,
    );
  return (
    <section className="card article-admin-form">
      <form onSubmit={submit}>
        <div className="article-form-body">
          <h2 className="article-form-title">
            {article ? "Edit Article" : "Add New Article"}
          </h2>
          <div className="row g-4">
            {input(
              "article_key",
              "Article Key",
              false,
              "text",
              false,
              "e.g., ART001",
            )}
            {input(
              "article_title",
              "Article Title",
              true,
              "text",
              false,
              "e.g., AI in Healthcare",
            )}
            <div className="col-md-6">
              <label className="form-label" htmlFor="article-journal">
                Journal Name *
              </label>
              <input
                id="article-journal"
                className="form-control bg-light"
                value={options.journal.journal_name}
                readOnly
              />
            </div>
            {input(
              "doi",
              "DOI",
              false,
              "text",
              false,
              "e.g., 10.1234/aihc2024",
            )}
            <div className="col-md-6">
              <span className="form-label d-block">Pages (From - To)</span>
              <div className="d-flex gap-2">
                <input
                  aria-label="First Page"
                  className="form-control"
                  placeholder="From (e.g., 1)"
                  maxLength={255}
                  value={values.page_from}
                  onChange={(event) => change("page_from", event.target.value)}
                  disabled={busy}
                />
                <input
                  aria-label="Last Page"
                  className="form-control"
                  placeholder="To (e.g., 10)"
                  maxLength={255}
                  value={values.page_to}
                  onChange={(event) => change("page_to", event.target.value)}
                  disabled={busy}
                />
              </div>
              {fields.page_to && (
                <div className="text-danger small">
                  {fields.page_to.join(" ")}
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="article-volume">
                Volume *
              </label>
              <select
                id="article-volume"
                className="form-select"
                value={volume}
                disabled={busy}
                required={!article || !!article.issue_id}
                onChange={(event) => {
                  setVolume(event.target.value);
                  change("issue_id", "");
                }}
              >
                <option value="">Select Volume</option>
                {article && !volumes.includes(article.volume) && (
                  <option value={article.volume}>
                    {article.volume} (legacy)
                  </option>
                )}
                {volumes.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="article-issue">
                Issue *
              </label>
              <select
                id="article-issue"
                className="form-select"
                value={values.issue_id}
                onChange={(event) => change("issue_id", event.target.value)}
                required={!article || !!article.issue_id}
                disabled={busy || !volume}
              >
                <option value="">
                  {article && !article.issue_id && volume === article.volume
                    ? `Keep legacy issue: ${article.issue} (${article.year})`
                    : "Select Issue"}
                </option>
                {options.issues
                  .filter((issue) => issue.volume_no === volume)
                  .map((issue) => (
                    <option key={issue.issue_id} value={issue.issue_id}>
                      {issue.issue_no} — {issue.year} ({issue.from_month}–
                      {issue.to_month}){issue.status === 1 ? "" : " · Inactive"}
                    </option>
                  ))}
              </select>
              {fields.issue_id && (
                <div className="text-danger small">
                  {fields.issue_id.join(" ")}
                </div>
              )}
              {!options.issues.length && (
                <p className="small mt-2">
                  No issues available.{" "}
                  <Link to="/portal/admin/journal-issue/add">
                    Add a journal issue
                  </Link>{" "}
                  first.
                </p>
              )}
            </div>
            {[
              [
                "Month From",
                selectedIssue?.from_month ||
                  (article && !values.issue_id ? article.month_from : ""),
              ],
              [
                "Month To",
                selectedIssue?.to_month ||
                  (article && !values.issue_id ? article.month_to : ""),
              ],
              [
                "Year",
                selectedIssue?.year ||
                  (article && !values.issue_id ? article.year : ""),
              ],
            ].map(([label = "", value]) => (
              <div className="col-md-6" key={label}>
                <label
                  className="form-label"
                  htmlFor={"article-" + label.replaceAll(" ", "-")}
                >
                  {label}
                </label>
                <input
                  id={"article-" + label.replaceAll(" ", "-")}
                  className="form-control bg-light"
                  value={value || ""}
                  placeholder="Filled from selected issue"
                  readOnly
                />
              </div>
            ))}
            {input("date_of_received", "Received Date", false, "date")}
            {input("date_of_acceptance", "Acceptance Date", false, "date")}
            {input("date_of_publication", "Publication Date", true, "date")}
            <div className="col-12">
              <label className="form-label" htmlFor="article-abstract">
                Abstract Text *
              </label>
              <JournalRichTextEditor
                id="article-abstract"
                label="Abstract Text"
                value={values.abstract}
                onChange={(value: string) => change("abstract", value)}
                disabled={busy}
              />
              {fields.abstract && (
                <div className="text-danger small">
                  {fields.abstract.join(" ")}
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="article-keywords">
                Keywords
              </label>
              <textarea
                id="article-keywords"
                className="form-control"
                value={values.keywords}
                maxLength={5000}
                rows={2}
                placeholder="e.g., AI, Healthcare, Innovation"
                onChange={(event) => change("keywords", event.target.value)}
                disabled={busy}
              />
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="article-reference">
                Reference
              </label>
              <JournalRichTextEditor
                id="article-reference"
                label="Reference"
                value={values.reference}
                onChange={(value: string) => change("reference", value)}
                disabled={busy}
              />
              {fields.reference && (
                <div className="text-danger small">
                  {fields.reference.join(" ")}
                </div>
              )}
            </div>
            <div className="col-12">
              <ArticleDocumentField
                kind="pdf"
                uploaded={pdfUpload}
                displayPath={articlePdfDisplayLink(
                  values.article_key,
                  values.article_file || (pdfUpload ? "/pending.pdf" : ""),
                )}
                savedPath={values.article_file}
                savedLink={
                  values.article_file.startsWith("/") &&
                  article &&
                  article.status !== 1
                    ? `/api/admin/articles/${article.article_id}/file`
                    : articlePdfDisplayLink(
                        article?.article_key || values.article_key,
                        values.article_file,
                      )
                }
                disabled={busy || uploadsBusy.word}
                onUploaded={setPdfUpload}
                onBusy={(value) =>
                  setUploadsBusy((old) => ({ ...old, pdf: value }))
                }
                onDelete={() => {
                  setPdfUpload(null);
                  change("article_file", "");
                }}
              />
              {article?.article_file && !values.article_file && !pdfUpload && (
                <p className="small text-muted mt-2" role="status">
                  PDF removed from this form. Upload a replacement before
                  saving, or Cancel to keep the saved PDF.
                </p>
              )}
            </div>
            <div className="col-12">
              <ArticleDocumentField
                kind="word"
                uploaded={wordUpload}
                savedPath={values.article_word_file}
                savedLink={
                  article && values.article_word_file
                    ? `/api/admin/articles/${article.article_id}/word`
                    : ""
                }
                disabled={busy || uploadsBusy.pdf}
                onUploaded={setWordUpload}
                onBusy={(value) =>
                  setUploadsBusy((old) => ({ ...old, word: value }))
                }
                onDelete={() => {
                  setWordUpload(null);
                  change("article_word_file", "");
                }}
              />
            </div>
            <div className="col-12">
              <ArticleAuthorPicker
                selected={authors}
                disabled={busy}
                error={fields.author_ids?.join(" ")}
                corresponding={values.corresponding_author}
                onCorresponding={(id) => change("corresponding_author", id)}
                onChange={(next) => {
                  setAuthors(next);
                  if (
                    values.corresponding_author &&
                    !next.some(
                      (author) =>
                        String(author.author_id) ===
                        values.corresponding_author,
                    )
                  )
                    change("corresponding_author", "");
                }}
              />
              {legacyCorresponding && (
                <p className="small mt-2">
                  Current corresponding author: {values.corresponding_author}.
                  Select an author above to replace it.
                </p>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="article-scholar">
                Google Scholar
              </label>
              <select
                id="article-scholar"
                className="form-select"
                value={values.google_scholar}
                onChange={(event) =>
                  change("google_scholar", event.target.value)
                }
                disabled={busy}
              >
                {values.google_scholar &&
                  !["true", "false"].includes(values.google_scholar) && (
                    <option value={values.google_scholar}>
                      {values.google_scholar} (current)
                    </option>
                  )}
                <option value="">Not specified</option>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="article-status">
                Status *
              </label>
              <select
                id="article-status"
                className="form-select"
                value={values.status}
                onChange={(event) => change("status", event.target.value)}
                disabled={busy}
                required
              >
                {article?.status == null && article && (
                  <option value="">Not set (legacy)</option>
                )}
                <option value="0">Draft</option>
                <option value="1">Published</option>
              </select>
              <small className="article-field-hint">
                Published articles appear in the public journal. Drafts and
                their uploaded PDFs remain private.
              </small>
            </div>
          </div>
          <small className="article-field-hint mt-3">
            Leave Article Key blank to generate one. Publication months and year
            come from the selected issue.
          </small>
          {error && (
            <div className="alert alert-danger mt-4" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="article-form-actions">
          <button
            className="btn button"
            disabled={busy || uploadsBusy.pdf || uploadsBusy.word}
          >
            {busy ? "Saving..." : article ? "Update" : "Add"}
          </button>
          <button
            type="button"
            className="btn button outline"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
