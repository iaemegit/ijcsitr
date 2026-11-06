"use client";
import { useState } from "react";
import { LoaderCircle, Save } from "lucide-react";
import adminApi from "../../../services/adminApi";
import { useAdmin } from "../../../context/AdminContext";
export default function DisciplineForm({
  discipline,
  onCancel,
  onSaved,
}: {
  discipline?: any;
  onCancel: () => void;
  onSaved: (notice: string) => void;
}) {
  const { session } = useAdmin();
  const [name, setName] = useState<any>(discipline?.discipline_name || ""),
    [department, setDepartment] = useState<any>(discipline?.department || ""),
    [status, setStatus] = useState<any>(discipline?.status === 0 ? 0 : 1),
    [error, setError] = useState(""),
    [fields, setFields] = useState<any>({}),
    [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    try {
      await adminApi(
        "/disciplines" + (discipline ? "/" + discipline.discipline_id : ""),
        {
          method: discipline ? "PUT" : "POST",
          csrfToken: session?.csrfToken,
          body: JSON.stringify({ discipline_name: name, department, status }),
        },
      );
      onSaved(
        discipline
          ? "Discipline updated successfully."
          : "Discipline created successfully.",
      );
    } catch (error) {
      setError(error.message);
      setFields(error.fields || {});
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card admin-discipline-form">
      <form onSubmit={submit}>
        <div className="discipline-form-body">
          <label className="form-label" htmlFor="discipline-name">
            Discipline name <span className="text-danger">*</span>
          </label>
          <input
            className={
              "form-control " + (fields.discipline_name ? "is-invalid" : "")
            }
            id="discipline-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={2}
            maxLength={5000}
            required
            autoFocus
            disabled={busy}
          />
          {fields.discipline_name && (
            <div className="invalid-feedback d-block">
              {fields.discipline_name.join(" ")}
            </div>
          )}
          <label className="form-label" htmlFor="discipline-department">
            Department
          </label>
          <textarea
            className="form-control"
            id="discipline-department"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            maxLength={5000}
            rows={3}
            disabled={busy}
          />
          <label className="form-label" htmlFor="discipline-status">
            Status <span className="text-danger">*</span>
          </label>
          <select
            className="form-select"
            id="discipline-status"
            value={status}
            onChange={(e) => setStatus(Number(e.target.value))}
            disabled={busy}
          >
            <option value={1}>Active</option>
            <option value={0}>Inactive</option>
          </select>
          <p className="admin-field-hint">
            Created and updated dates are recorded automatically.
          </p>
          {error && (
            <div className="alert alert-danger admin-alert" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="discipline-form-actions">
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
            {busy
              ? "Saving…"
              : discipline
                ? "Save changes"
                : "Create discipline"}
          </button>
        </div>
      </form>
    </section>
  );
}
