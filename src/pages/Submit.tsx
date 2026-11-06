"use client";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  LoaderCircle,
  Mail,
  UploadCloud,
} from "lucide-react";
import { useState } from "react";
import { Link } from "../lib/navigation";
import PageIntro from "../components/PageIntro";
import api from "../services/api";
function Submit() {
  const [file, setFile] = useState<any>(null);
  const [status, setStatus] = useState<any>({
    busy: false,
    error: null,
    success: null,
  });
  async function submit(e) {
    e.preventDefault();
    if (!file) {
      setStatus({
        error: "Please choose your PDF manuscript.",
      });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setStatus({
        error: "Your PDF must be 10 MB or smaller.",
      });
      return;
    }
    const form = new FormData(e.currentTarget);
    form.set("consent", "true");
    setStatus({
      busy: true,
    });
    try {
      const result = await api("/submissions", {
        method: "POST",
        body: form,
      });
      setStatus({
        success: result.id,
      });
    } catch (error) {
      setStatus({
        error: error.message,
      });
    }
  }
  return (
    <main>
      <PageIntro
        label="FOR AUTHORS"
        title="For authors"
        description="Share original work with the IJCSITR research community."
      />
      <section className="container section submission-layout">
        <aside className="guidelines">
          <span className="eyebrow muted">BEFORE YOU SUBMIT</span>
          <h2>
            Give your work
            <br />a strong start.
          </h2>
          <p>
            Prepare a complete manuscript with a clear title, abstract,
            keywords, methodology, and references.
          </p>
          {[
            "Submit original, unpublished research.",
            "Include all author names and affiliations.",
            "Use consistent citations and references.",
            "Upload one PDF, no larger than 10 MB.",
          ].map((v) => (
            <div className="guideline-item" key={v}>
              <CheckCircle2 size={17} />
              <span>{v}</span>
            </div>
          ))}
          <div className="guidelines-contact">
            <Mail size={21} />
            <p>Have a question about your submission?</p>
            <Link className="text-link" to="/contact">
              Contact the editorial office <ArrowUpRight size={15} />
            </Link>
          </div>
        </aside>
        <div className="form-panel">
          {status.success ? (
            <div className="success-panel" role="status">
              <CheckCircle2 size={43} />
              <span className="eyebrow">SUBMISSION RECEIVED</span>
              <h2>Thank you for contributing.</h2>
              <p>Your manuscript is ready for editorial review.</p>
              <div className="submission-reference">
                Reference{" "}
                <b>IJCSITR-{String(status.success).padStart(5, "0")}</b>
              </div>
              <p className="muted-text">
                Keep this reference for correspondence with the editorial
                office.
              </p>
              <Link className="button btn" to="/articles">
                Explore the journal <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <span className="eyebrow muted">MANUSCRIPT SUBMISSION</span>
              <h2>Tell us about your research.</h2>
              <p className="form-intro">All fields are required.</p>
              <label className="form-label">
                Article title
                <input
                  name="article_title"
                  placeholder="The title of your research paper"
                  minLength={10}
                  maxLength={500}
                  required
                  className="form-control"
                />
              </label>
              <div className="row g-3">
                <label className="form-label col-md-6">
                  Corresponding author
                  <input
                    name="author_name"
                    placeholder="Full name"
                    minLength={2}
                    maxLength={200}
                    required
                    className="form-control"
                  />
                </label>
                <label className="form-label col-md-6">
                  Email address
                  <input
                    type="email"
                    name="email"
                    placeholder="you@university.edu"
                    maxLength={255}
                    required
                    className="form-control"
                  />
                </label>
              </div>
              <div className="row g-3">
                <label className="form-label col-md-6">
                  Country
                  <input
                    name="country"
                    placeholder="Country of residence"
                    minLength={2}
                    maxLength={100}
                    required
                    className="form-control"
                  />
                </label>
                <label className="form-label col-md-6">
                  Research discipline
                  <select
                    name="discipline_title"
                    required
                    defaultValue=""
                    className="form-select"
                  >
                    <option value="" disabled>
                      Select a discipline
                    </option>
                    {[
                      "Artificial intelligence",
                      "Computer science",
                      "Data science",
                      "Cloud computing",
                      "Cybersecurity",
                      "Software engineering",
                      "Information systems",
                      "Other",
                    ].map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="form-label">
                Keywords
                <textarea
                  name="keywords"
                  placeholder="Separate your research keywords with commas"
                  minLength={3}
                  maxLength={2000}
                  rows={3}
                  required
                  className="form-control"
                />
              </label>
              <label className="form-label">
                Manuscript PDF
                <span className="upload-area">
                  <UploadCloud size={27} />
                  <strong>{file ? file.name : "Choose your manuscript"}</strong>
                  <span>PDF format · maximum 10 MB</span>
                  <input
                    type="file"
                    name="manuscript"
                    accept=".pdf,application/pdf"
                    required
                    onChange={(e) => setFile(e.target.files?.[0] || null)}
                    className="form-control"
                  />
                </span>
              </label>
              <label className="checkbox-label">
                <input type="checkbox" required className="form-check-input" />
                <span>
                  I confirm this work is original, all authors agree to its
                  submission, and I consent to the journal storing this
                  manuscript and my contact details for editorial review.
                </span>
              </label>
              {status.error && (
                <p className="form-error" role="alert">
                  {status.error}
                </p>
              )}
              <button className="button form-submit btn" disabled={status.busy}>
                {status.busy ? (
                  <>
                    <LoaderCircle className="spin" size={17} /> Submitting…
                  </>
                ) : (
                  <>
                    Submit manuscript <ArrowUpRight size={17} />
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
export default Submit;
