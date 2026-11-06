"use client";
import { useEffect, useState } from "react";
import { useAdmin } from "../../../context/AdminContext";
import adminApi from "../../../services/adminApi";
import {
  boardFields,
  boardRoles,
  type BoardValues,
  type BoardMember,
} from "./editorial-board-types";
import "./editorial-board.css";
const inputs: [keyof typeof boardFields, string, string][] = [
  ["prefix", "Prefix", "e.g., Dr."],
  ["editor_name", "Editor Name", "e.g., John Doe"],
  [
    "editor_affiliation",
    "Editor Affiliation",
    "e.g., Department of Computer Science, XYZ University",
  ],
  ["editor_email", "Editor Email", "e.g., john.doe@example.com"],
  ["editor_type", "Editor Type", ""],
  ["profile_link", "Profile Link", "e.g., http://example.com/profile"],
  [
    "institutional_profile",
    "Institutional Profile",
    "e.g., http://example.com/institutional_profile",
  ],
  [
    "google_scholar_profile",
    "Google Scholar Profile",
    "e.g., http://scholar.google.com/johndoe",
  ],
  ["orcid_link", "ORCID Link", "e.g., http://orcid.org/0000-0002-1825-0097"],
  ["publon_link", "Publon Link", "e.g., http://publons.com/johndoe"],
  ["scopus_author_id", "Scopus Author ID", "e.g., 12345678900"],
  [
    "research_gate_profile",
    "ResearchGate Profile",
    "e.g., http://researchgate.net/johndoe",
  ],
  ["linkedin", "LinkedIn", "e.g., http://linkedin.com/in/johndoe"],
];
export default function EditorialBoardForm({
  member,
  onCancel,
  onSaved,
}: {
  member?: BoardMember;
  onCancel: () => void;
  onSaved: (notice: string) => void;
}) {
  const { session } = useAdmin();
  const [values, setValues] = useState<BoardValues>(
    () =>
      ({
        ...Object.fromEntries(
          Object.keys(boardFields).map((key) => [key, member?.[key] ?? ""]),
        ),
        editor_type: member?.editor_type || "",
        status: member ? member.status : 1,
      }) as BoardValues,
  );
  const [journal, setJournal] = useState<{
      journal_id: number;
      journal_name: string;
    } | null>(null),
    [journalId, setJournalId] = useState(
      member ? String(member.journal_id) : "",
    );
  const [photo, setPhoto] = useState<File | null>(null),
    [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [fields, setFields] = useState<Record<string, string[]>>({}),
    [loadError, setLoadError] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoadError("");
    adminApi("/editorial-board/options", { signal: controller.signal })
      .then((data) => setJournal(data.journal))
      .catch((err) => {
        if (err.name !== "AbortError") setLoadError(err.message);
      });
    return () => controller.abort();
  }, [retry]);
  useEffect(() => {
    if (!photo) {
      setPreview("");
      return;
    }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);
  function change(key: keyof BoardValues, value: string) {
    setValues((old) => ({ ...old, [key]: value }));
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFields({});
    if (!journal || journalId !== String(journal.journal_id)) {
      setError("Select the journal.");
      return;
    }
    if (photo && photo.size > 5 * 1024 * 1024) {
      setError("The profile photo must be 5 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      let body: string | FormData = JSON.stringify(values);
      if (photo) {
        body = new FormData();
        body.append("data", JSON.stringify(values));
        body.append("profile_photo_file", photo);
      }
      await adminApi(
        "/editorial-board" + (member ? "/" + member.member_id : ""),
        {
          method: member ? "PUT" : "POST",
          csrfToken: session?.csrfToken,
          body,
        },
      );
      onSaved(`Board member ${member ? "updated" : "created"} successfully.`);
    } catch (err) {
      setError(err.message);
      setFields(err.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card board-form">
      <form onSubmit={submit}>
        <div className="board-form-body">
          <h2>
            {member
              ? "Edit Editorial Board Member"
              : "Add New Editorial Board Member"}
          </h2>
          {loadError && (
            <div className="alert alert-danger" role="alert">
              {loadError}
              <button
                type="button"
                className="btn btn-link"
                onClick={() => setRetry((v) => v + 1)}
              >
                Try again
              </button>
            </div>
          )}
          <div className="row g-4">
            <div className="col-md-6">
              <label className="form-label" htmlFor="board-journal">
                Journal *
              </label>
              <select
                id="board-journal"
                className="form-select"
                value={journalId}
                onChange={(e) => setJournalId(e.target.value)}
                disabled={busy || !journal}
                required
              >
                <option value="">-- Select Journal --</option>
                {journal && (
                  <option value={journal.journal_id}>
                    {journal.journal_name}
                  </option>
                )}
              </select>
            </div>
            {inputs.map(([key, label, placeholder]) => {
              const required = [
                "editor_name",
                "editor_affiliation",
                "editor_type",
              ].includes(key);
              return (
                <div className="col-md-6" key={key}>
                  <label className="form-label" htmlFor={"board-" + key}>
                    {label}
                    {required ? " *" : ""}
                  </label>
                  {key === "editor_type" ? (
                    <select
                      id={"board-" + key}
                      className="form-select"
                      value={values[key]}
                      onChange={(e) => change(key, e.target.value)}
                      required
                      disabled={busy}
                    >
                      <option value="">-- Select Editor Type --</option>
                      {values[key] && !boardRoles.includes(values[key]) && (
                        <option value={values[key]}>{values[key]}</option>
                      )}
                      {boardRoles.map((role) => (
                        <option key={role}>{role}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id={"board-" + key}
                      className={
                        "form-control " + (fields[key] ? "is-invalid" : "")
                      }
                      type={key === "editor_email" ? "email" : "text"}
                      value={values[key]}
                      onChange={(e) => change(key, e.target.value)}
                      placeholder={placeholder}
                      required={required}
                      maxLength={
                        key === "prefix"
                          ? 50
                          : key === "editor_affiliation"
                            ? 5000
                            : 255
                      }
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
              <label className="form-label" htmlFor="board-photo">
                Profile Photo
              </label>
              <input
                id="board-photo"
                className="form-control"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                onChange={(e) => setPhoto(e.target.files?.[0] || null)}
                disabled={busy}
              />
              <small className="board-photo-hint">
                JPG, PNG or WebP. Maximum 5 MB.
              </small>
              {(preview ||
                values.profile_photo.startsWith(
                  "/api/admin/editorial-board/photos/",
                )) && (
                <img
                  src={preview || values.profile_photo}
                  alt="Editorial board member preview"
                  className="board-photo-preview"
                />
              )}
              {member?.profile_photo && !photo && (
                <small className="board-photo-hint">
                  Current photo is preserved unless you upload a replacement.
                </small>
              )}
            </div>
          </div>
          {error && (
            <div className="alert alert-danger mt-4" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="board-form-actions">
          <button className="btn button" disabled={busy || !journal}>
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
