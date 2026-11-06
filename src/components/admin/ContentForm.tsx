"use client";
import { useState } from "react";
import { useAdmin } from "../../context/AdminContext";
import adminApi from "../../services/adminApi";
import { countries } from "../../data/countries";
import type { ContentConfig, ContentRecord } from "./content-types";
import "./content-admin.css";
export default function ContentForm({
  config,
  record,
  onCancel,
  onSaved,
}: {
  config: ContentConfig;
  record?: ContentRecord;
  onCancel: () => void;
  onSaved: (notice: string) => void;
}) {
  const { session } = useAdmin();
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(
      config.fields.map((field) => [
        field.key,
        String(record?.[field.key] ?? ""),
      ]),
    ),
    ...(config.fileField
      ? { [config.fileField]: String(record?.[config.fileField] || "") }
      : {}),
    status: record
      ? record.status == null
        ? ""
        : String(record.status)
      : config.key === "testimonial"
        ? "0"
        : "1",
  }));
  const [attachment, setAttachment] = useState<File | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string[]>>({});
  function change(key: string, value: string) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFields({});
    if (
      attachment &&
      attachment.size > (config.fileType === "image" ? 5 : 10) * 1024 * 1024
    ) {
      setError("The file exceeds the allowed upload size.");
      return;
    }
    setBusy(true);
    try {
      const data = {
        ...values,
        ...(config.status
          ? { status: values.status === "" ? null : Number(values.status) }
          : {}),
      };
      let body: string | FormData = JSON.stringify(data);
      if (attachment) {
        body = new FormData();
        body.append("data", JSON.stringify(data));
        body.append("attachment", attachment);
      }
      await adminApi(
        "/resources/" + config.key + (record ? "/" + record[config.id] : ""),
        {
          method: record ? "PUT" : "POST",
          csrfToken: session?.csrfToken,
          body,
        },
      );
      onSaved(
        `${config.title} ${record ? "updated" : "created"} successfully.`,
      );
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }
  const current = config.fileField ? values[config.fileField] : "",
    external = /^https?:\/\//i.test(current),
    viewable =
      current.startsWith("/api/admin/content-files/") ||
      (config.key === "online-papers" && /^[a-f0-9-]{36}\.pdf$/.test(current));
  return (
    <section className="card content-admin-form">
      <form onSubmit={submit}>
        <div className="content-admin-form-body">
          <p className="small text-muted">Fields marked * are required.</p>
          <div className="row g-4">
            {config.fields.map((field) => (
              <div
                key={field.key}
                className={field.type === "textarea" ? "col-12" : "col-md-6"}
              >
                <label
                  className="form-label"
                  htmlFor={config.key + "-" + field.key}
                >
                  {field.label}
                  {field.required ? " *" : ""}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    id={config.key + "-" + field.key}
                    className="form-control"
                    rows={4}
                    maxLength={field.max || 255}
                    value={values[field.key]}
                    onChange={(e) => change(field.key, e.target.value)}
                    required={field.required}
                    disabled={busy}
                  />
                ) : field.type === "country" ? (
                  <select
                    id={config.key + "-" + field.key}
                    className="form-select"
                    value={values[field.key]}
                    onChange={(e) => change(field.key, e.target.value)}
                    required={field.required}
                    disabled={busy}
                  >
                    <option value="">Select country</option>
                    {values[field.key] &&
                      !countries.some(
                        (country) => country.name === values[field.key],
                      ) && <option>{values[field.key]}</option>}
                    {countries.map((country) => (
                      <option key={country.code}>{country.name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={config.key + "-" + field.key}
                    className="form-control"
                    type={
                      field.type === "email"
                        ? "email"
                        : field.type === "url"
                          ? "url"
                          : "text"
                    }
                    maxLength={field.max || 255}
                    value={values[field.key]}
                    onChange={(e) => change(field.key, e.target.value)}
                    required={field.required}
                    disabled={busy}
                  />
                )}
                {fields[field.key] && (
                  <div className="text-danger small">
                    {fields[field.key].join(" ")}
                  </div>
                )}
              </div>
            ))}
            {config.status && (
              <div className="col-md-6">
                <label className="form-label" htmlFor={config.key + "-status"}>
                  Status
                </label>
                <select
                  id={config.key + "-status"}
                  className="form-select"
                  value={values.status}
                  onChange={(e) => change("status", e.target.value)}
                  disabled={busy}
                >
                  {record?.status == null && record && (
                    <option value="">Not set (legacy)</option>
                  )}
                  <option value="1">Active</option>
                  <option value="0">
                    {config.key === "online-papers" || config.key === "join-us"
                      ? "Pending"
                      : "Inactive"}
                  </option>
                </select>
              </div>
            )}
            {config.fileField && (
              <div className="col-12">
                <label className="form-label" htmlFor={config.key + "-file"}>
                  {config.fileLabel}
                </label>
                <input
                  id={config.key + "-file"}
                  className="form-control"
                  type="file"
                  accept={
                    config.fileType === "image"
                      ? ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                      : ".pdf,application/pdf"
                  }
                  onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  disabled={busy}
                />
                <small className="text-muted">
                  {config.fileType === "image"
                    ? "JPG, PNG or WebP up to 5 MB."
                    : "PDF up to 10 MB."}
                </small>
                {current && (
                  <div className="mt-2">
                    {external || viewable ? (
                      <a
                        href={
                          external
                            ? current
                            : `/api/admin/resources/${config.key}/${record?.[config.id]}/attachment`
                        }
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open current file
                      </a>
                    ) : (
                      <span className="small">Current file saved.</span>
                    )}
                  </div>
                )}
                {config.key === "downloads" && (
                  <div className="mt-3">
                    <label className="form-label" htmlFor="download-url">
                      Or existing download URL
                    </label>
                    <input
                      id="download-url"
                      className="form-control"
                      type={current.startsWith("/api/admin/") ? "text" : "url"}
                      value={current}
                      onChange={(e) =>
                        change(config.fileField!, e.target.value)
                      }
                      disabled={busy}
                    />
                    <small className="text-muted">
                      Upload a PDF or enter an HTTP/HTTPS URL.
                    </small>
                  </div>
                )}
              </div>
            )}
          </div>
          {error && (
            <div className="alert alert-danger mt-4" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="content-admin-form-actions">
          <button
            className="btn button outline"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="btn button" disabled={busy}>
            {busy ? "Saving..." : record ? "Save changes" : "Add"}
          </button>
        </div>
      </form>
    </section>
  );
}
