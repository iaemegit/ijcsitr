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
const inputs: [string, string, boolean, string][] = [
  ["year", "Year", true, "year"],
  ["volume_no", "Volume Number", true, "number"],
  ["issue_no", "Issue Number", true, "number"],
  ["title", "Title", false, "text"],
  ["from_month", "From Month", true, "month"],
  ["to_month", "To Month", true, "month"],
  ["status", "Status", false, "status"],
  ["special_issue", "Special Issue", true, "special"],
  ["special_issue_title", "Special Issue Title", false, "text"],
  ["cover_image", "Cover Image URL or Path", false, "text"],
  ["file_path", "Issue File URL or Path", false, "text"],
  ["table_of_contents", "Table of Contents URL or Path", false, "text"],
];
export default function JournalIssueForm({
  issue,
  onSaved,
  onCancel,
}: {
  issue?: any;
  onSaved: (notice: string) => void;
  onCancel: () => void;
}) {
  const { session } = useAdmin();
  const [values, setValues] = useState<any>(
    () =>
      issue || {
        year: String(new Date().getFullYear()),
        volume_no: "",
        issue_no: "",
        title: "",
        from_month: "January",
        to_month: "December",
        status: 1,
        special_issue: "No",
        special_issue_title: "",
        cover_image: "",
        file_path: "",
        table_of_contents: "",
      },
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<any>({});
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      const data = {
        ...values,
        status:
          values.status === "" || values.status == null
            ? null
            : Number(values.status),
      };
      await adminApi("/journal-issues" + (issue ? "/" + issue.issue_id : ""), {
        method: issue ? "PUT" : "POST",
        csrfToken: session?.csrfToken,
        body: JSON.stringify(data),
      });
      onSaved(`Journal issue ${issue ? "updated" : "created"} successfully.`);
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card issue-form">
      <form onSubmit={submit}>
        <div className="p-4">
          <p className="text-muted small">
            Fields marked with * are required. The issue belongs to your
            existing journal.
          </p>
          <div className="row g-4">
            {inputs.map(([key, label, required, type]) => {
              required =
                required ||
                (key === "special_issue_title" &&
                  values.special_issue === "Yes");
              const options =
                type === "month"
                  ? months.map((value) => [value, value])
                  : type === "status"
                    ? [
                        ["", "Not set"],
                        ["1", "Active"],
                        ["0", "Inactive"],
                      ]
                    : [
                        ["No", "No"],
                        ["Yes", "Yes"],
                      ];
              return (
                <div className="col-md-6" key={key}>
                  <label className="form-label" htmlFor={"issue-" + key}>
                    {label}
                    {required && <span className="text-danger"> *</span>}
                  </label>
                  {["month", "status", "special"].includes(type) ? (
                    <select
                      id={"issue-" + key}
                      className={
                        "form-select " + (fields[key] ? "is-invalid" : "")
                      }
                      required={required}
                      disabled={busy}
                      value={values[key] ?? ""}
                      onChange={(event) =>
                        setValues((old) => ({
                          ...old,
                          [key]: event.target.value,
                        }))
                      }
                    >
                      {options.map(([value, text]) => (
                        <option key={value} value={value}>
                          {text}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={"issue-" + key}
                      className={
                        "form-control " + (fields[key] ? "is-invalid" : "")
                      }
                      type="text"
                      inputMode={
                        ["year", "number"].includes(type)
                          ? "numeric"
                          : undefined
                      }
                      pattern={
                        type === "year"
                          ? "[0-9]{4}"
                          : type === "number"
                            ? "[1-9][0-9]{0,8}"
                            : undefined
                      }
                      maxLength={key === "cover_image" ? 2000 : 255}
                      required={required}
                      disabled={busy}
                      value={values[key] ?? ""}
                      onChange={(event) =>
                        setValues((old) => ({
                          ...old,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  )}
                  {fields[key] && (
                    <div className="invalid-feedback">
                      {fields[key].join(" ")}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="small text-muted mt-4">
            Image and document fields store URLs or paths. Files are not
            uploaded here.
          </p>
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="issue-form-actions">
          <button className="btn button" disabled={busy}>
            {busy ? "Saving..." : "Save"}
          </button>
          <button
            type="button"
            className="btn button outline"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
