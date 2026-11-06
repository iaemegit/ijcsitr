"use client";
import { useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import AffiliationPicker from "./AffiliationPicker";
import "./author.css";
const defaults = {
  prefix: "",
  author_code: "",
  alternate_name: "",
  email: "",
  department: "",
  designation: "",
  logo: "",
  papers_published: 0,
  profile_views: 0,
  status: 1,
};
export default function AuthorForm({
  author,
  onCancel,
  onSaved,
}: {
  author?: any;
  onCancel: () => void;
  onSaved: (notice: string) => void;
}) {
  const { session } = useAdmin();
  const originalName = [author?.first_name, author?.last_name]
    .filter(Boolean)
    .join(" ");
  const [values, setValues] = useState<any>(() =>
      Object.fromEntries(
        Object.entries(defaults).map(([key, fallback]) => [
          key,
          author?.[key] ?? fallback,
        ]),
      ),
    ),
    [fullName, setFullName] = useState<any>(originalName),
    [selected, setSelected] = useState<any>(
      author?.affiliation ||
        (author?.university
          ? {
              aff_id: null,
              aff_name: author.university,
              address: author.address,
              country: author.country,
            }
          : null),
    ),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<any>({}),
    [affiliationError, setAffiliationError] = useState("");
  const [affiliations, setAffiliations] = useState<any>(() =>
    author?.affiliations?.length
      ? author.affiliations
      : selected
        ? [{ ...selected, department: author?.department || "" }]
        : [],
  );
  function change(key, value) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  async function submit(event) {
    event.preventDefault();
    if (!selected) {
      setAffiliationError(
        "Search for and select an affiliation before saving.",
      );
      document.getElementById("author-affiliation-search")?.focus();
      return;
    }
    setBusy(true);
    setError("");
    setFields({});
    setAffiliationError("");
    try {
      await adminApi("/authors" + (author ? "/" + author.author_id : ""), {
        method: author ? "PUT" : "POST",
        csrfToken: session?.csrfToken,
        body: JSON.stringify({
          ...values,
          first_name:
            author && fullName.trim() === originalName
              ? author.first_name
              : fullName.trim(),
          last_name:
            author && fullName.trim() === originalName
              ? author.last_name || ""
              : "",
          affiliation_id: selected.aff_id ? Number(selected.aff_id) : null,
          ...(affiliations.some((item) => item.aff_id)
            ? {
                affiliations: affiliations
                  .filter((item) => item.aff_id)
                  .map((item) => ({
                    affiliation_id: Number(item.aff_id),
                    department:
                      item.aff_id === selected.aff_id
                        ? values.department
                        : item.department || "",
                  })),
              }
            : {}),
          university: selected.aff_name,
          address: selected.address,
          country: selected.country || "",
          papers_published: Number(values.papers_published),
          profile_views: Number(values.profile_views),
          status: Number(values.status),
        }),
      });
      onSaved(
        author
          ? "Author updated successfully."
          : "Author created successfully.",
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
    {
      required = false,
      type = "text",
      hint,
      placeholder,
    }: {
      required?: boolean;
      type?: string;
      hint?: string;
      placeholder?: string;
    } = {},
  ) {
    return (
      <div className="col-md-6">
        <label className="form-label" htmlFor={"author-" + key}>
          {label}
          {required && <span className="text-danger"> *</span>}
        </label>
        <input
          id={"author-" + key}
          className={"form-control " + (fields[key] ? "is-invalid" : "")}
          type={type}
          value={values[key]}
          onChange={(event) => change(key, event.target.value)}
          required={required}
          maxLength={type === "email" ? 255 : 5000}
          disabled={busy}
          placeholder={placeholder}
        />
        {hint && <small className="author-reference-hint">{hint}</small>}
        {fields[key] && (
          <div className="invalid-feedback">{fields[key].join(" ")}</div>
        )}
      </div>
    );
  }
  const prefixes = [
    ...new Set(
      ["Dr.", "Prof.", "Mr.", "Mrs.", "Ms.", "Mx.", values.prefix].filter(
        Boolean,
      ),
    ),
  ];
  return (
    <section className="card admin-author-form author-reference-form">
      <form onSubmit={submit}>
        <div className="author-form-body">
          <div className="row author-reference-grid">
            {input("author_code", "Author ID", {
              placeholder: "Auto-generated on save",
            })}
            <div className="col-md-6">
              <label className="form-label" htmlFor="author-status">
                Status <span className="text-danger">*</span>
              </label>
              <select
                id="author-status"
                className="form-select"
                value={values.status}
                onChange={(event) =>
                  change("status", Number(event.target.value))
                }
                required
                disabled={busy}
              >
                <option value={1}>Active</option>
                <option value={0}>Inactive</option>
              </select>
              <small className="author-reference-hint">
                Open the list and type to search.
              </small>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="author-prefix">
                Prefix
              </label>
              <select
                id="author-prefix"
                className="form-select"
                value={values.prefix}
                onChange={(event) => change("prefix", event.target.value)}
                disabled={busy}
              >
                <option value="">Select Prefix</option>
                {prefixes.map((prefix) => (
                  <option key={prefix} value={prefix}>
                    {prefix}
                  </option>
                ))}
              </select>
              <small className="author-reference-hint">
                Open the list and type to search.
              </small>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="author-full-name">
                Author Full Name <span className="text-danger">*</span>
              </label>
              <input
                id="author-full-name"
                className={
                  "form-control " + (fields.first_name ? "is-invalid" : "")
                }
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                required
                maxLength={5000}
                disabled={busy}
              />
              {fields.first_name && (
                <div className="invalid-feedback">
                  {fields.first_name.join(" ")}
                </div>
              )}
            </div>
            {input("alternate_name", "Alternate Author Names", {
              hint: "Enter multiple alternate names separated by semicolons.",
            })}
            <div className="col-md-6 author-grid-spacer" aria-hidden="true" />
            <AffiliationPicker
              selected={selected}
              affiliations={affiliations}
              onChange={(items, primary) => {
                setAffiliations(items);
                setSelected(primary);
                change("department", primary.department || "");
                setAffiliationError("");
              }}
              onRemove={() => {
                const remaining = affiliations.filter(
                  (item) => item.aff_id !== selected.aff_id,
                );
                setAffiliations(remaining);
                setSelected(remaining[0] || null);
                change("department", remaining[0]?.department || "");
              }}
              department={values.department}
              onDepartmentChange={(value) => {
                change("department", value);
                setAffiliations((items) =>
                  items.map((item) =>
                    item.aff_id === selected.aff_id
                      ? { ...item, department: value }
                      : item,
                  ),
                );
              }}
              disabled={busy}
              error={affiliationError || fields.affiliation_id?.join(" ")}
            />
            {input("email", "Email", { type: "email" })}
          </div>
          <details className="author-extra-details">
            <summary>Additional profile details</summary>
            <div className="row g-4 mt-1">
              {input("designation", "Designation")}
              {input("logo", "Profile image URL or path")}
              {[
                ["papers_published", "Papers published"],
                ["profile_views", "Profile views"],
              ].map(([key, label]) => (
                <div className="col-md-6" key={key}>
                  <label className="form-label" htmlFor={"author-" + key}>
                    {label}
                  </label>
                  <input
                    id={"author-" + key}
                    className="form-control"
                    type="number"
                    value={values[key]}
                    onChange={(event) => change(key, event.target.value)}
                    min={0}
                    max={2147483647}
                    step={1}
                    required
                    disabled={busy}
                  />
                </div>
              ))}
            </div>
          </details>
          {error && (
            <div className="alert alert-danger admin-alert" role="alert">
              {error}
              {Object.entries(fields)
                .filter(
                  ([key]) =>
                    !["first_name", "email", "affiliation_id"].includes(key),
                )
                .map(([key, messages]) => (
                  <div key={key}>{(messages as string[]).join(" ")}</div>
                ))}
            </div>
          )}
        </div>
        <div className="author-form-actions">
          <button
            type="button"
            className="btn button outline"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="btn button" disabled={busy}>
            {busy ? (
              <LoaderCircle size={16} className="spin" />
            ) : (
              <Save size={16} />
            )}{" "}
            {busy ? "Saving…" : author ? "Save changes" : "Create author"}
          </button>
        </div>
      </form>
    </section>
  );
}
