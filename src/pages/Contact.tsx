"use client";
import { ArrowRight, ArrowUpRight, CheckCircle2 } from "lucide-react";
import { useState, useContext } from "react";
import JournalContext from "../context/JournalContext";
import { Link } from "../lib/navigation";
import PageIntro from "../components/PageIntro";
import api from "../services/api";
function Contact() {
  const journal = useContext(JournalContext).data?.journal;
  const [status, setStatus] = useState<any>({});
  async function submit(e) {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.currentTarget));
    setStatus({
      busy: true,
    });
    try {
      await api("/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      setStatus({
        success: true,
      });
    } catch (error) {
      setStatus({
        error: error.message,
      });
    }
  }
  return (
    <main className="compact-info-page">
      <PageIntro
        label="CONTACT THE JOURNAL"
        title="Contact the editorial office"
        description="Questions about the journal, your research, or a submission? Get in touch."
      />
      <section className="container section contact-grid">
        <div className="prose">
          <span className="eyebrow muted">EDITORIAL OFFICE</span>
          <h2>We’re here to help.</h2>
          <p>
            Send an enquiry to the IJCSITR editorial office. For questions about
            an existing manuscript, include your submission reference in the
            subject.
          </p>
          <div className="jt-contact mb-4">
            <h3>Editorial enquiries</h3>
            <p>
              For manuscript and publication enquiries, contact the journal at:
            </p>
            <a href={`mailto:${journal?.email || "editor@ijcsitr.com"}`}>
              {journal?.email || "editor@ijcsitr.com"}
            </a>
          </div>
          <Link className="text-link" to="/submit">
            Looking to submit a paper? <ArrowUpRight size={17} />
          </Link>
        </div>
        <div className="form-panel">
          {status.success ? (
            <div className="success-panel" role="status">
              <CheckCircle2 size={40} />
              <h2>Your message has been received.</h2>
              <p>Thank you for contacting the IJCSITR editorial office.</p>
              <Link className="button btn" to="/">
                Back to the journal <ArrowRight size={16} />
              </Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              <h2>Send us a message.</h2>
              <label className="form-label">
                Your name
                <input
                  name="name"
                  required
                  minLength={2}
                  maxLength={150}
                  className="form-control"
                />
              </label>
              <label className="form-label">
                Email address
                <input
                  type="email"
                  name="email"
                  required
                  maxLength={255}
                  className="form-control"
                />
              </label>
              <label className="form-label">
                Subject
                <input
                  name="subject"
                  required
                  minLength={3}
                  maxLength={200}
                  className="form-control"
                />
              </label>
              <label className="form-label">
                Message
                <textarea
                  name="message"
                  rows={5}
                  required
                  minLength={10}
                  maxLength={255}
                  className="form-control"
                />
                <small>Up to 255 characters.</small>
              </label>
              {status.error && (
                <p className="form-error" role="alert">
                  {status.error}
                </p>
              )}
              <button className="button btn" disabled={status.busy}>
                {status.busy ? "Sending…" : "Send message"}
                <ArrowUpRight size={17} />
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
}
export default Contact;
