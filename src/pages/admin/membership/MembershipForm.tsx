"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import { membershipFields, type MembershipMember } from "./membership-types";
import "./membership.css";
export default function MembershipForm({
  member,
  onCancel,
  onSaved,
}: {
  member?: MembershipMember;
  onCancel: () => void;
  onSaved: (notice: string) => void;
}) {
  const { session } = useAdmin();
  const [values, setValues] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(
      membershipFields.map(([key]) => [key, String(member?.[key] ?? "")]),
    ),
    photo: String(member?.photo || ""),
    status: member ? (member.status == null ? "" : String(member.status)) : "1",
  }));
  const [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string[]>>({});
  const currentYear = new Date().getFullYear(),
    years = Array.from(
      { length: currentYear + 11 - 1900 },
      (_, index) => currentYear + 10 - index,
    );
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
        membership_year: Number(values.membership_year),
        status: values.status === "" ? null : Number(values.status),
      };
      let body: string | FormData = JSON.stringify(data);
      if (photo) {
        body = new FormData();
        body.append("data", JSON.stringify(data));
        body.append("profile_photo_file", photo);
      }
      await adminApi(
        "/memberships" + (member ? "/" + member.membership_id : ""),
        {
          method: member ? "PUT" : "POST",
          csrfToken: session?.csrfToken,
          body,
        },
      );
      onSaved(`Membership ${member ? "updated" : "created"} successfully.`);
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card membership-form">
      <form onSubmit={submit}>
        <div className="membership-form-body">
          <h2>{member ? "Edit Membership" : "Add New Membership"}</h2>
          <div className="row g-4">
            {membershipFields.map(([key, label, placeholder]) => {
              const required = [
                "membership_type",
                "membership_year",
                "name",
                "email",
              ].includes(key);
              return (
                <div className="col-md-6" key={key}>
                  <label className="form-label" htmlFor={"membership-" + key}>
                    {label}
                    {required ? " *" : ""}
                  </label>
                  {key === "membership_year" ? (
                    <select
                      id={"membership-" + key}
                      className="form-select"
                      value={values[key]}
                      onChange={(e) => change(key, e.target.value)}
                      required
                      disabled={busy}
                    >
                      <option value="">Select Year</option>
                      {values[key] && !years.includes(Number(values[key])) && (
                        <option value={values[key]}>{values[key]}</option>
                      )}
                      {years.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={"membership-" + key}
                      className={
                        "form-control " + (fields[key] ? "is-invalid" : "")
                      }
                      value={values[key]}
                      onChange={(e) => change(key, e.target.value)}
                      placeholder={placeholder}
                      type={
                        key === "email"
                          ? "email"
                          : key === "mobile_number"
                            ? "tel"
                            : "text"
                      }
                      maxLength={255}
                      required={required}
                      disabled={busy}
                    />
                  )}
                  {fields[key] && (
                    <div className="text-danger small">
                      {fields[key].join(" ")}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="col-12">
              <label className="form-label" htmlFor="membership-photo">
                Photo
              </label>
              <input
                id="membership-photo"
                className="form-control"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                disabled={busy}
              />
              <small className="membership-photo-hint">
                JPG, PNG or WebP. Maximum 5 MB.
              </small>
              {(preview ||
                values.photo.startsWith("/api/admin/memberships/photos/")) && (
                <img
                  className="membership-photo-preview"
                  src={preview || values.photo}
                  alt="Membership photo preview"
                />
              )}
              {member?.photo && !photo && (
                <small className="membership-photo-hint">
                  The current photo is preserved unless you upload a
                  replacement.
                </small>
              )}
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="membership-status">
                Status
              </label>
              <select
                id="membership-status"
                className="form-select"
                value={values.status}
                onChange={(e) => change("status", e.target.value)}
                disabled={busy}
              >
                {member?.status == null && member && (
                  <option value="">Not set (legacy)</option>
                )}
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
        <div className="membership-form-actions">
          <button className="btn button" disabled={busy}>
            {busy ? "Saving..." : member ? "Update" : "Add"}
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
