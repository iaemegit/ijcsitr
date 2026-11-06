"use client";
import { useState } from "react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import { months, type CallForPaperRecord } from "./call-for-paper-types";
import "./call-for-paper.css";
const controls = [
  ["issue_month", "Issue Month", "month"],
  ["issue_year", "Issue Year", "year"],
  ["deadline", "Deadline", "date"],
  ["dispatch_month", "Dispatch Month", "month"],
  ["dispatch_year", "Dispatch Year", "year"],
  ["dispatch_date", "Dispatch Date", "date"],
] as const;
export default function CallForPaperForm({
  call,
  onCancel,
  onSaved,
}: {
  call?: CallForPaperRecord;
  onCancel: () => void;
  onSaved: (notice: string) => void;
}) {
  const { session } = useAdmin();
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(
      controls.map(([key]) => [
        key,
        key === "deadline" || key === "dispatch_date"
          ? call?.[key]?.slice(0, 10) || ""
          : call?.[key] || "",
      ]),
    ),
    file: call?.file || "",
    status: String(call?.status ?? 1),
  }));
  const [pdf, setPdf] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string[]>>({});
  const currentYear = new Date().getFullYear(),
    years = Array.from({ length: currentYear + 11 - 1900 }, (_, index) =>
      String(currentYear + 10 - index),
    );
  function change(key: string, value: string) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFields({});
    if (pdf && pdf.size > 10 * 1024 * 1024) {
      setError("The PDF must be 10 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const data = { ...values, status: Number(values.status) };
      let body: string | FormData = JSON.stringify(data);
      if (pdf) {
        body = new FormData();
        body.append("data", JSON.stringify(data));
        body.append("call_pdf", pdf);
      }
      await adminApi("/calls-for-papers" + (call ? "/" + call.call_id : ""), {
        method: call ? "PUT" : "POST",
        csrfToken: session?.csrfToken,
        body,
      });
      onSaved(`Call for papers ${call ? "updated" : "created"} successfully.`);
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card cfp-form">
      <form onSubmit={submit}>
        <div className="cfp-form-body">
          <p className="cfp-hint">
            Set the issue period, submission deadline and dispatch schedule.
            Fields marked * are required.
          </p>
          <div className="row g-4">
            {controls.map(([key, label, type]) => (
              <div className="col-md-6" key={key}>
                <label className="form-label" htmlFor={"cfp-" + key}>
                  {label} *
                </label>
                {type === "date" ? (
                  <input
                    id={"cfp-" + key}
                    className="form-control"
                    type="date"
                    value={values[key]}
                    onChange={(e) => change(key, e.target.value)}
                    required
                    disabled={busy}
                    min={
                      key === "dispatch_date"
                        ? values.deadline || undefined
                        : undefined
                    }
                  />
                ) : (
                  <select
                    id={"cfp-" + key}
                    className="form-select"
                    value={values[key]}
                    onChange={(e) => change(key, e.target.value)}
                    required
                    disabled={busy}
                  >
                    <option value="">
                      Select {type === "month" ? "Month" : "Year"}
                    </option>
                    {values[key] &&
                      !(type === "month" ? months : years).includes(
                        values[key],
                      ) && <option value={values[key]}>{values[key]}</option>}
                    {(type === "month" ? months : years).map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                )}
                {fields[key] && (
                  <div className="text-danger small">
                    {fields[key].join(" ")}
                  </div>
                )}
              </div>
            ))}
            <div className="col-12 cfp-file-section">
              <label className="form-label" htmlFor="cfp-file">
                File (PDF)
              </label>
              <input
                id="cfp-file"
                className="form-control"
                type="file"
                accept=".pdf,application/pdf"
                disabled={busy}
                onChange={(e) => setPdf(e.target.files?.[0] || null)}
              />
              <small className="cfp-hint d-block mt-2">
                Optional. Maximum 10 MB. Uploading a new PDF replaces the
                current file.
              </small>
              {call?.file && values.file && (
                <div className="cfp-current-file">
                  {values.file.startsWith(
                    "/api/admin/calls-for-papers/files/",
                  ) || /^https?:\/\//i.test(values.file) ? (
                    <a href={values.file} target="_blank" rel="noreferrer">
                      Open current PDF
                    </a>
                  ) : (
                    <span>Current file: {values.file}</span>
                  )}
                  <button
                    type="button"
                    className="btn btn-sm text-danger"
                    disabled={busy}
                    onClick={() => change("file", "")}
                  >
                    Remove current file
                  </button>
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="cfp-status">
                Status
              </label>
              <select
                id="cfp-status"
                className="form-select"
                value={values.status}
                onChange={(e) => change("status", e.target.value)}
                disabled={busy}
              >
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          </div>
          {error && (
            <div className="alert alert-danger mt-4" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="cfp-form-actions">
          <button
            className="btn button outline"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="btn button" disabled={busy}>
            {busy ? "Saving..." : call ? "Update" : "Add"}
          </button>
        </div>
      </form>
    </section>
  );
}
