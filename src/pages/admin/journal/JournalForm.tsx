"use client";
import { useEffect, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import JournalRichTextEditor from "./JournalRichTextEditor";
import "./journal.css";

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
const inputs: [string, string, boolean, string, string?][] = [
  ["discipline_id", "Discipline", true, "discipline"],
  ["journal_key", "Journal Key", true, "text", "e.g., JNL-CS-001"],
  [
    "journal_name",
    "Journal Name",
    true,
    "text",
    "e.g., Journal of Computer Science",
  ],
  ["abbrevation", "Abbreviation", false, "text", "e.g., JCS"],
  ["issn_online", "ISSN Online", false, "text", "e.g., 1234-5678"],
  ["issn_print", "ISSN Print", false, "text", "e.g., 4321-8765"],
  [
    "google_scholar",
    "Google Scholar",
    false,
    "text",
    "e.g., https://scholar.google.com/",
  ],
  ["doi", "DOI", false, "text", "e.g., 10.1000/jcs001"],
  [
    "publication_frequency",
    "Publication Frequency",
    true,
    "text",
    "e.g., Monthly",
  ],
  ["coden", "Coden", false, "text", "e.g., C1234"],
  ["email", "Email", false, "email", "e.g., editor@jcs.com"],
  ["start_month", "Start Month", true, "month"],
  ["start_year", "Start Year", true, "year"],
  ["sub_price", "Subscription Price", false, "text", "e.g., $100"],
];
export default function JournalForm({
  journal,
  disciplines,
  onCancel,
  onSaved,
}) {
  const { session } = useAdmin();
  const [values, setValues] = useState<any>(() => ({ ...journal }));
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<any>({});
  const [cover, setCover] = useState<any>(null),
    [preview, setPreview] = useState("");
  useEffect(() => {
    if (!cover) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(cover);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);
  const change = (field, value) =>
    setValues((old) => ({ ...old, [field]: value }));
  const year = new Date().getFullYear();
  const years = [
    ...new Set([
      String(values.start_year || ""),
      ...Array.from({ length: year - 1899 }, (_, i) => String(year - i)),
    ]),
  ]
    .filter(Boolean)
    .sort((a, b) => Number(b) - Number(a));
  async function submit(event) {
    event.preventDefault();
    setError("");
    setFields({});
    for (const [key, label] of [
      ["subject_area", "Subject Area"],
      ["about_us", "About Us"],
    ]) {
      const doc = new DOMParser().parseFromString(
        values[key] || "",
        "text/html",
      );
      if (!doc.body.textContent.trim()) {
        setError(`${label} is required.`);
        document.getElementById(`journal-${key}`)?.focus();
        return;
      }
    }
    setBusy(true);
    try {
      const data = {
        ...values,
        discipline_id: values.discipline_id
          ? Number(values.discipline_id)
          : null,
        status:
          values.status == null || values.status === ""
            ? null
            : Number(values.status),
      };
      let body: string | FormData = JSON.stringify(data);
      if (cover) {
        body = new FormData();
        body.append("data", JSON.stringify(data));
        body.append("cover_image", cover);
      }
      await adminApi("/journal", {
        method: "PUT",
        csrfToken: session?.csrfToken,
        body,
      });
      onSaved("Journal updated successfully.");
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }
  const savedCover =
    journal.cover_page?.startsWith("/media/journal-covers/") ||
    /^https:\/\//i.test(journal.cover_page || "")
      ? journal.cover_page
      : "";
  return (
    <section className="card admin-journal-form">
      <form onSubmit={submit}>
        <div className="journal-form-body">
          <div className="row g-4">
            {inputs.map(([key, label, required, type, placeholder]) => (
              <div className="col-md-6" key={key}>
                <label className="form-label" htmlFor={`journal-${key}`}>
                  {label}
                  {required && <span className="text-danger"> *</span>}
                </label>
                {["discipline", "month", "year"].includes(type) ? (
                  <select
                    id={`journal-${key}`}
                    className={`form-select ${fields[key] ? "is-invalid" : ""}`}
                    value={values[key] ?? ""}
                    required={required}
                    disabled={busy}
                    onChange={(event) => change(key, event.target.value)}
                  >
                    <option value="">Select {label}</option>
                    {type === "discipline"
                      ? disciplines.map((item) => (
                          <option
                            key={item.discipline_id}
                            value={item.discipline_id}
                          >
                            {item.discipline_name}
                          </option>
                        ))
                      : (type === "year"
                          ? years
                          : [
                              ...new Set(
                                [...months, values.start_month].filter(Boolean),
                              ),
                            ]
                        ).map((item) => (
                          <option key={item} value={item}>
                            {item}
                          </option>
                        ))}
                  </select>
                ) : (
                  <input
                    id={`journal-${key}`}
                    className={`form-control ${fields[key] ? "is-invalid" : ""}`}
                    type={type}
                    value={values[key] ?? ""}
                    placeholder={placeholder}
                    required={required}
                    minLength={key === "journal_name" ? 2 : undefined}
                    maxLength={255}
                    disabled={busy}
                    onChange={(event) => change(key, event.target.value)}
                  />
                )}
                {fields[key] && (
                  <div className="invalid-feedback">
                    {fields[key].join(" ")}
                  </div>
                )}
              </div>
            ))}
            {[
              ["subject_area", "Subject Area"],
              ["about_us", "About Us"],
            ].map(([key, label]) => (
              <div className="col-12" key={key}>
                <label className="form-label" htmlFor={`journal-${key}`}>
                  {label} <span className="text-danger">*</span>
                </label>
                <JournalRichTextEditor
                  id={`journal-${key}`}
                  label={label}
                  value={values[key]}
                  onChange={(value) => change(key, value)}
                  disabled={busy}
                />
                {fields[key] && (
                  <div className="text-danger small">
                    {fields[key].join(" ")}
                  </div>
                )}
              </div>
            ))}
            <div className="col-12">
              <label className="form-label" htmlFor="journal-cover">
                Cover Image
              </label>
              <input
                id="journal-cover"
                className="form-control"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                disabled={busy}
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && file.size > 5 * 1024 * 1024) {
                    setError("The cover image must be 5 MB or smaller.");
                    event.target.value = "";
                    setCover(null);
                    return;
                  }
                  setCover(file || null);
                  setError("");
                }}
              />
              <small className="journal-field-hint">
                JPEG, PNG or WebP. Maximum 5 MB. Leave empty to keep the current
                cover.
              </small>
              {(preview || savedCover) && (
                <img
                  className="journal-cover-preview"
                  src={preview || savedCover}
                  alt="Journal cover preview"
                />
              )}
            </div>
          </div>
          {error && (
            <div className="alert alert-danger mt-4" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="journal-form-actions">
          <button className="btn journal-save" disabled={busy}>
            {busy && <LoaderCircle size={15} className="spin" />}
            {busy ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="btn journal-cancel"
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
