"use client";
import { useState } from "react";
import { CheckCircle2, ArrowRight } from "lucide-react";
import useApi from "../../hooks/useApi";
import api from "../../services/api";
import { countries } from "../../data/countries";
import { Link } from "../../lib/navigation";
const fields = [
  { name: "name", label: "Full name", required: true, max: 255 },
  {
    name: "email_id",
    label: "Email ID",
    type: "email",
    required: true,
    max: 255,
  },
  { name: "affiliation", label: "Affiliation", max: 255 },
  { name: "qualification", label: "Qualification", required: true, max: 5000 },
  { name: "researcharea", label: "Research area(s)", max: 5000 },
  {
    name: "mobile_number",
    label: "Mobile number",
    type: "tel",
    required: true,
    max: 20,
  },
  { name: "state", label: "State / Province", required: true, max: 255 },
  { name: "city", label: "City / District", required: true, max: 255 },
];
export default function ReviewerApplicationForm() {
  const options = useApi<{
    disciplines: { discipline_id: number; discipline_name: string }[];
  }>("/join/options");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [reference, setReference] = useState<number | null>(null);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const body = new FormData(event.currentTarget);
    const file = body.get("resume");
    if (!(file instanceof File) || !file.size) {
      setError("Attach your resume or CV.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Your resume must be 10 MB or smaller.");
      return;
    }
    setBusy(true);
    try {
      const result = await api("/join", { method: "POST", body });
      setReference(result.id);
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  if (reference)
    return (
      <div className="join-success" role="status">
        <CheckCircle2 size={36} />
        <h3>Application received</h3>
        <p>
          Your application reference is{" "}
          <strong>IJCSITR-JOIN-{reference}</strong>. The editorial team will
          review your details.
        </p>
        <Link to="/editorial-board" className="jt-text-link">
          Explore the editorial board <ArrowRight size={15} />
        </Link>
      </div>
    );
  return (
    <div className="form-panel join-application">
      <h3>Reviewer / Board registration</h3>
      <p>
        Fields marked * are required. Check your details carefully; they may be
        used on your certificate.
      </p>
      <form onSubmit={submit}>
        <fieldset disabled={busy}>
          <legend className="visually-hidden">
            Reviewer application details
          </legend>
          <div className="row g-3">
            <div className="col-md-6">
              <label className="form-label" htmlFor="join-prefix">
                Salutation *
                <select
                  id="join-prefix"
                  name="prefix"
                  required
                  defaultValue=""
                  className="form-select"
                >
                  <option value="">Select salutation</option>
                  {["Mr", "Ms", "Mrs", "Dr", "Prof"].map((value) => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
              </label>
            </div>
            {fields.map((field) => (
              <div className="col-md-6" key={field.name}>
                <label className="form-label" htmlFor={`join-${field.name}`}>
                  {field.label}
                  {field.required ? " *" : ""}
                  <input
                    id={`join-${field.name}`}
                    name={field.name}
                    type={field.type || "text"}
                    required={field.required}
                    minLength={
                      field.required
                        ? field.name === "mobile_number"
                          ? 5
                          : 2
                        : undefined
                    }
                    maxLength={field.max}
                    className="form-control"
                  />
                </label>
              </div>
            ))}
            <div className="col-md-6">
              <label className="form-label" htmlFor="join-discipline">
                Discipline field *
                <select
                  id="join-discipline"
                  name="discipline"
                  required
                  defaultValue=""
                  disabled={
                    options.loading || !options.data?.disciplines.length
                  }
                  className="form-select"
                >
                  <option value="">
                    {options.loading
                      ? "Loading disciplines..."
                      : "Select discipline"}
                  </option>
                  {options.data?.disciplines.map((discipline) => (
                    <option key={discipline.discipline_id}>
                      {discipline.discipline_name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="col-md-6">
              <label className="form-label" htmlFor="join-country">
                Country *
                <select
                  id="join-country"
                  name="country"
                  required
                  defaultValue=""
                  className="form-select"
                >
                  <option value="">Select country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.name}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="join-message">
                Message
                <textarea
                  id="join-message"
                  name="message"
                  rows={5}
                  maxLength={10000}
                  className="form-control"
                />
              </label>
            </div>
            <div className="col-12">
              <label className="form-label" htmlFor="join-resume">
                Resume / CV *
                <input
                  id="join-resume"
                  type="file"
                  name="resume"
                  required
                  accept=".pdf,.doc,.docx"
                  className="form-control"
                />
              </label>
              <small className="text-muted">
                PDF, DOC or DOCX. Maximum 10 MB. Your CV is accessible only to
                the editorial administration team.
              </small>
            </div>
          </div>
          {options.error && (
            <div className="alert alert-danger mt-3" role="alert">
              Unable to load disciplines.{" "}
              <button
                type="button"
                className="btn btn-link p-0"
                onClick={options.retry}
              >
                Try again
              </button>
            </div>
          )}
          {!options.loading &&
            !options.error &&
            !options.data?.disciplines.length && (
              <p className="mt-3" role="status">
                No disciplines are currently available. Please contact the
                editorial office.
              </p>
            )}
          {error && (
            <div className="alert alert-danger mt-3" role="alert">
              {error}
            </div>
          )}
          <button
            className="button btn mt-4"
            disabled={
              busy || options.loading || !options.data?.disciplines.length
            }
          >
            {busy ? "Submitting..." : "Submit application"}
          </button>
        </fieldset>
      </form>
    </div>
  );
}
