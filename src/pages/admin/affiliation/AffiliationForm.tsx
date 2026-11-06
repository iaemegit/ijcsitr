"use client";
import { useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import "./affiliation.css";
import { countries } from "../../../data/countries";
const empty = {
  aff_name: "",
  aff_code: "",
  alternate_name: "",
  address: "",
  country: "",
  website: "",
  logo: "",
  status: 1,
};
export default function AffiliationForm({
  affiliation,
  onCancel,
  onSaved,
}: {
  affiliation?: any;
  onCancel: () => void;
  onSaved: (notice: string) => void;
}) {
  const { session } = useAdmin();
  const [values, setValues] = useState<any>(() =>
      Object.fromEntries(
        Object.entries(empty).map(([key, fallback]) => [
          key,
          affiliation?.[key] ?? fallback,
        ]),
      ),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<any>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  function change(key, value) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setFields({});
    try {
      if (logoFile && logoFile.size > 5 * 1024 * 1024)
        throw new Error("The logo must be 5 MB or smaller.");
      const data = { ...values, status: Number(values.status) };
      let body: string | FormData = JSON.stringify(data);
      if (logoFile) {
        body = new FormData();
        body.append("data", JSON.stringify(data));
        body.append("logo_file", logoFile);
      }
      await adminApi(
        "/affiliations" + (affiliation ? "/" + affiliation.aff_id : ""),
        {
          method: affiliation ? "PUT" : "POST",
          csrfToken: session?.csrfToken,
          body,
        },
      );
      onSaved(
        affiliation
          ? "Affiliation updated successfully."
          : "Affiliation created successfully.",
      );
    } catch (error) {
      setError(error.message);
      setFields(error.fields || {});
    } finally {
      setBusy(false);
    }
  }
  function input(
    key,
    label,
    { required = false, type = "text", full = false } = {},
  ) {
    return (
      <div className={full ? "col-12" : "col-md-6"} key={key}>
        <label className="form-label" htmlFor={"affiliation-" + key}>
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
        <input
          id={"affiliation-" + key}
          className={"form-control " + (fields[key] ? "is-invalid" : "")}
          type={type}
          value={values[key]}
          onChange={(event) => change(key, event.target.value)}
          required={required}
          maxLength={255}
          minLength={required ? 2 : undefined}
          disabled={busy}
        />
        {fields[key] && (
          <div className="invalid-feedback">{fields[key].join(" ")}</div>
        )}
      </div>
    );
  }
  return (
    <section className="card admin-affiliation-form">
      <form onSubmit={submit}>
        <div className="affiliation-form-body">
          <h2>Affiliation details</h2>
          <p className="affiliation-form-intro">
            Fields marked with * are required.
          </p>
          <div className="row g-4">
            {input("aff_name", "Affiliation name", {
              full: true,
            })}
            {input("aff_code", "Affiliation code")}
            {input("alternate_name", "Alternate name")}
            <div className="col-12">
              <label className="form-label" htmlFor="affiliation-address">
                Address
              </label>
              <textarea
                id="affiliation-address"
                className={
                  "form-control " + (fields.address ? "is-invalid" : "")
                }
                rows={3}
                value={values.address}
                onChange={(event) => change("address", event.target.value)}
                maxLength={255}
                disabled={busy}
              />
              {fields.address && (
                <div className="invalid-feedback">
                  {fields.address.join(" ")}
                </div>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="affiliation-country">
                Country <span className="text-danger">*</span>
              </label>
              <select
                id="affiliation-country"
                className={
                  "form-select " + (fields.country ? "is-invalid" : "")
                }
                value={values.country}
                onChange={(event) => change("country", event.target.value)}
                required
                disabled={busy}
              >
                <option value="">Select country</option>
                {values.country &&
                  !countries.some(
                    (country) => country.name === values.country,
                  ) && <option value={values.country}>{values.country}</option>}
                {countries.map((country) => (
                  <option key={country.code} value={country.name}>
                    {country.name}
                  </option>
                ))}
              </select>
              {fields.country && (
                <div className="invalid-feedback">
                  {fields.country.join(" ")}
                </div>
              )}
            </div>
            {input("website", "Website", { type: "url" })}
            <div className="col-md-6">
              <label className="form-label" htmlFor="affiliation-logo-upload">
                Upload Logo
              </label>
              <input
                id="affiliation-logo-upload"
                className="form-control"
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={(event) =>
                  setLogoFile(event.target.files?.[0] || null)
                }
                disabled={busy}
              />
              <small className="admin-field-hint">
                JPG, PNG or WebP. Maximum 5 MB.
              </small>
              {values.logo && (
                <p className="small mt-2 mb-0">
                  Current logo saved. Upload a file to replace it.
                </p>
              )}
              {values.logo?.startsWith("/api/admin/affiliations/logos/") && (
                <img
                  src={values.logo}
                  alt="Current affiliation logo"
                  className="affiliation-logo-preview"
                />
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="affiliation-status">
                Status <span className="text-danger">*</span>
              </label>
              <select
                id="affiliation-status"
                className="form-select"
                value={values.status}
                onChange={(event) =>
                  change("status", Number(event.target.value))
                }
                disabled={busy}
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
                {![0, 1].includes(Number(values.status)) && (
                  <option value={values.status}>
                    Legacy status {values.status} — select a status
                  </option>
                )}
              </select>
            </div>
          </div>
          <p className="admin-field-hint">
            Created and updated dates are recorded automatically.
          </p>
          {error && (
            <div className="alert alert-danger admin-alert" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="affiliation-form-actions">
          <button
            type="button"
            className="btn button outline"
            disabled={busy}
            onClick={onCancel}
          >
            Cancel
          </button>
          <button className="btn button" disabled={busy}>
            {busy ? (
              <LoaderCircle className="spin" size={16} />
            ) : (
              <Save size={16} />
            )}{" "}
            {busy
              ? "Saving…"
              : affiliation
                ? "Save changes"
                : "Create affiliation"}
          </button>
        </div>
      </form>
    </section>
  );
}
