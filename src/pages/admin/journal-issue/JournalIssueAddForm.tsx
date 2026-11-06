"use client";
import { useState } from "react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import "./journal-issue.css";
const months = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
type Props = {
  journal: { journal_id: number; journal_name: string };
  onCancel: () => void;
  onSaved: (notice: string) => void;
};
export default function JournalIssueAddForm({
  journal,
  onCancel,
  onSaved,
}: Props) {
  const { session } = useAdmin();
  const [values, setValues] = useState({
    journals_id: "",
    volume_no: "",
    issue_no: "",
    from_month: "",
    to_month: "",
    year: "",
    special_issue: "No",
    special_issue_title: "",
    table_of_contents: "",
  });
  const [pdf, setPdf] = useState<File | null>(null),
    [cover, setCover] = useState<File | null>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string[]>>({});
  const lastYear = new Date().getFullYear() + 1;
  function change(key: keyof typeof values, value: string) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFields({});
    if (pdf && pdf.size > 10 * 1024 * 1024) {
      setError("The issue PDF must be 10 MB or smaller.");
      return;
    }
    if (cover && cover.size > 5 * 1024 * 1024) {
      setError("The cover image must be 5 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const body = new FormData();
      body.append(
        "data",
        JSON.stringify({
          ...values,
          journals_id: Number(values.journals_id),
          title: "",
          status: 1,
          cover_image: null,
          file_path: null,
        }),
      );
      if (pdf) body.append("issue_file", pdf);
      if (cover) body.append("cover_file", cover);
      await adminApi("/journal-issues", {
        method: "POST",
        csrfToken: session?.csrfToken,
        body,
      });
      onSaved("Journal issue created successfully.");
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }
  const fieldError = (key: string) =>
    fields[key] && (
      <div className="invalid-feedback d-block">{fields[key].join(" ")}</div>
    );
  const control = (key: string) =>
    "form-control " + (fields[key] ? "is-invalid" : "");
  return (
    <section className="card issue-form issue-add-form">
      <form onSubmit={submit}>
        <div className="issue-add-body">
          <div className="row g-4">
            <div className="col-md-6">
              <label className="form-label" htmlFor="issue-journal">
                Journal *
              </label>
              <select
                id="issue-journal"
                className="form-select"
                value={values.journals_id}
                onChange={(event) => change("journals_id", event.target.value)}
                required
                disabled={busy}
              >
                <option value="">-- Select Journal --</option>
                <option value={journal.journal_id}>
                  {journal.journal_name}
                </option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="issue-volume_no">
                Volume No *
              </label>
              <input
                id="issue-volume_no"
                className={control("volume_no")}
                value={values.volume_no}
                onChange={(event) => change("volume_no", event.target.value)}
                placeholder="e.g., Vol. 10"
                inputMode="numeric"
                pattern="[1-9][0-9]{0,8}"
                maxLength={9}
                required
                disabled={busy}
              />
              {fieldError("volume_no")}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="issue-issue_no">
                Issue No *
              </label>
              <input
                id="issue-issue_no"
                className={control("issue_no")}
                value={values.issue_no}
                onChange={(event) => change("issue_no", event.target.value)}
                placeholder="e.g., Issue 1"
                inputMode="numeric"
                pattern="[1-9][0-9]{0,8}"
                maxLength={9}
                required
                disabled={busy}
              />
              {fieldError("issue_no")}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="issue-from_month">
                From Month *
              </label>
              <select
                id="issue-from_month"
                className="form-select"
                value={values.from_month}
                onChange={(event) => change("from_month", event.target.value)}
                required
                disabled={busy}
              >
                <option value="">Select Month</option>
                {months.map((month) => (
                  <option key={month}>{month}</option>
                ))}
              </select>
              {fieldError("from_month")}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="issue-to_month">
                To Month *
              </label>
              <select
                id="issue-to_month"
                className="form-select"
                value={values.to_month}
                onChange={(event) => change("to_month", event.target.value)}
                required
                disabled={busy}
              >
                <option value="">Select Month</option>
                {months.map((month) => (
                  <option key={month}>{month}</option>
                ))}
              </select>
              {fieldError("to_month")}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="issue-year">
                Year *
              </label>
              <select
                id="issue-year"
                className="form-select"
                value={values.year}
                onChange={(event) => change("year", event.target.value)}
                required
                disabled={busy}
              >
                <option value="">Select Year</option>
                {Array.from(
                  { length: lastYear - 1899 },
                  (_, index) => lastYear - index,
                ).map((year) => (
                  <option key={year}>{year}</option>
                ))}
              </select>
              {fieldError("year")}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="issue-special_issue">
                Special Issue *
              </label>
              <select
                id="issue-special_issue"
                className="form-select"
                value={values.special_issue}
                onChange={(event) =>
                  change("special_issue", event.target.value)
                }
                disabled={busy}
                required
              >
                <option>No</option>
                <option>Yes</option>
              </select>
            </div>
            {values.special_issue === "Yes" && (
              <div className="col-md-6">
                <label
                  className="form-label"
                  htmlFor="issue-special_issue_title"
                >
                  Special Issue Title *
                </label>
                <input
                  id="issue-special_issue_title"
                  className={control("special_issue_title")}
                  value={values.special_issue_title}
                  onChange={(event) =>
                    change("special_issue_title", event.target.value)
                  }
                  maxLength={255}
                  required
                  disabled={busy}
                />
                {fieldError("special_issue_title")}
              </div>
            )}
            <div className="col-12">
              <label className="form-label" htmlFor="issue-table_of_contents">
                Table of Contents
              </label>
              <input
                id="issue-table_of_contents"
                className={control("table_of_contents")}
                value={values.table_of_contents}
                onChange={(event) =>
                  change("table_of_contents", event.target.value)
                }
                maxLength={255}
                placeholder="e.g., toc_ai_issue1.pdf"
                disabled={busy}
              />
              {fieldError("table_of_contents")}
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="issue-pdf">
                Issue File (PDF)
              </label>
              <input
                id="issue-pdf"
                className="form-control"
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => setPdf(event.target.files?.[0] || null)}
                disabled={busy}
              />
              <small className="issue-upload-hint">PDF, up to 10 MB.</small>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="issue-cover">
                Cover Image (JPG/PNG)
              </label>
              <input
                id="issue-cover"
                className="form-control"
                type="file"
                accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                onChange={(event) => setCover(event.target.files?.[0] || null)}
                disabled={busy}
              />
              <small className="issue-upload-hint">
                JPG or PNG, up to 5 MB.
              </small>
            </div>
          </div>
          {error && (
            <div className="alert alert-danger mt-4" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="issue-form-actions">
          <button className="btn issue-add-button" disabled={busy}>
            {busy ? "Adding..." : "Add"}
          </button>
          <button
            className="btn issue-cancel-button"
            type="button"
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
