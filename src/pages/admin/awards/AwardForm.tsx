"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import { awardFields, type AwardRecord } from "./award-types";
import "./award.css";
export default function AwardForm({
  member,
  onCancel,
  onSaved,
}: {
  member?: AwardRecord;
  onCancel: () => void;
  onSaved: (notice: string) => void;
}) {
  const { session } = useAdmin();
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(
      awardFields.map(([key]) => [key, String(member?.[key] ?? "")]),
    ),
    profile_photo: String(member?.profile_photo || ""),
    status: member ? (member.status == null ? "" : String(member.status)) : "1",
  }));
  const [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string[]>>({});
  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  function change(key: string, value: string) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFields({});
    if (photo && photo.size > 5 * 1024 * 1024) {
      setError("The profile photo must be 5 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const data = {
        ...values,
        status: values.status === "" ? null : Number(values.status),
      };
      let body: string | FormData = JSON.stringify(data);
      if (photo) {
        body = new FormData();
        body.append("data", JSON.stringify(data));
        body.append("profile_photo_file", photo);
      }
      await adminApi("/awards" + (member ? "/" + member.id : ""), {
        method: member ? "PUT" : "POST",
        csrfToken: session?.csrfToken,
        body,
      });
      onSaved(`Award ${member ? "updated" : "created"} successfully.`);
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }
  function renderField(key: (typeof awardFields)[number][0]) {
    const [, label, placeholder] = awardFields.find(
      ([field]) => field === key,
    )!;
    const required = key === "name" || key === "award_type";
    return (
      <div className={key === "content" ? "col-12" : "col-md-6"} key={key}>
        <label className="form-label" htmlFor={"award-" + key}>
          {label}
          {required && <span className="award-required"> *</span>}
        </label>
        {key === "content" ? (
          <textarea
            id={"award-" + key}
            className={"form-control " + (fields[key] ? "is-invalid" : "")}
            rows={5}
            maxLength={255}
            value={values[key]}
            onChange={(event) => change(key, event.target.value)}
            placeholder={placeholder}
            disabled={busy}
            aria-invalid={!!fields[key]}
            aria-describedby="award-content-help"
          />
        ) : (
          <input
            id={"award-" + key}
            className={"form-control " + (fields[key] ? "is-invalid" : "")}
            type={key === "email" ? "email" : "text"}
            value={values[key]}
            onChange={(event) => change(key, event.target.value)}
            placeholder={placeholder}
            maxLength={255}
            required={required}
            disabled={busy}
            aria-invalid={!!fields[key]}
            aria-describedby={fields[key] ? "award-error-" + key : undefined}
          />
        )}
        {key === "content" && (
          <div className="award-content-meta" id="award-content-help">
            <span>
              Describe the achievement or contribution being recognized.
            </span>
            <span>{values.content.length}/255 characters</span>
          </div>
        )}
        {fields[key] && (
          <div className="invalid-feedback d-block" id={"award-error-" + key}>
            {fields[key].join(" ")}
          </div>
        )}
      </div>
    );
  }
  return (
    <section className="card award-form award-form-professional">
      <form onSubmit={submit}>
        <div className="award-form-body">
          <p className="award-form-intro">
            Fields marked <span className="award-required">*</span> are
            required. All professional profiles and the photo are optional.
          </p>
          <fieldset className="award-form-section">
            <legend>
              <span className="award-section-number">01</span>
              <span>
                Recipient &amp; award details
                <small>
                  Identify the recipient and the recognition they received.
                </small>
              </span>
            </legend>
            <div className="row g-4">
              {["name", "affiliation", "email", "award_type"].map((key) =>
                renderField(key as (typeof awardFields)[number][0]),
              )}
            </div>
          </fieldset>
          <fieldset className="award-form-section">
            <legend>
              <span className="award-section-number">02</span>
              <span>
                Award content
                <small>Add a concise citation for the award.</small>
              </span>
            </legend>
            <div className="row g-4">{renderField("content")}</div>
          </fieldset>
          <fieldset className="award-form-section">
            <legend>
              <span className="award-section-number">03</span>
              <span>
                Professional profiles
                <small>
                  Connect the recipient’s academic and professional presence.
                </small>
              </span>
            </legend>
            <div className="row g-4">
              {[
                "linkedin",
                "researchgate",
                "academia",
                "google_scholar",
                "orcid",
              ].map((key) =>
                renderField(key as (typeof awardFields)[number][0]),
              )}
            </div>
          </fieldset>
          <fieldset className="award-form-section award-photo-section">
            <legend>
              <span className="award-section-number">04</span>
              <span>
                Profile photo
                <small>Choose a clear portrait of the award recipient.</small>
              </span>
            </legend>
            <div className="award-upload-panel">
              {preview ||
              values.profile_photo.startsWith("/api/admin/awards/photos/") ? (
                <img
                  className="award-photo-preview"
                  src={preview || values.profile_photo}
                  alt="Award photo preview"
                />
              ) : (
                <div className="award-photo-placeholder" aria-hidden="true">
                  <span>{(values.name.trim()[0] || "?").toUpperCase()}</span>
                </div>
              )}
              <div className="award-upload-input">
                <label className="form-label" htmlFor="award-photo">
                  Profile Photo
                </label>
                <input
                  id="award-photo"
                  className="form-control"
                  type="file"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={(event) =>
                    setPhoto(event.target.files?.[0] || null)
                  }
                  disabled={busy}
                  aria-describedby="award-photo-help"
                />
                <small className="award-photo-hint" id="award-photo-help">
                  JPG, PNG or WebP. Maximum 5 MB.
                </small>
                {member?.profile_photo && !photo && (
                  <small className="award-photo-hint">
                    The current photo is preserved unless you upload a
                    replacement.
                  </small>
                )}
              </div>
            </div>
          </fieldset>
          {member && (
            <div className="award-edit-status">
              <label className="form-label" htmlFor="award-status">
                Status
              </label>
              <select
                id="award-status"
                className="form-select"
                value={values.status}
                onChange={(event) => change("status", event.target.value)}
                disabled={busy}
              >
                {member.status == null && (
                  <option value="">Not set (legacy)</option>
                )}
                <option value="1">Active</option>
                <option value="0">Inactive</option>
              </select>
            </div>
          )}
          {error && (
            <div className="alert alert-danger mt-4" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="award-form-actions">
          <span className="award-action-hint">
            Review the recipient’s details before saving.
          </span>
          <button
            className="btn button outline"
            type="button"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button className="btn button" disabled={busy}>
            {busy ? "Saving..." : member ? "Update" : "Add"}
          </button>
        </div>
      </form>
    </section>
  );
}
