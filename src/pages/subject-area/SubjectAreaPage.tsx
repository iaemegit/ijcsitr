"use client";
import { useContext, useState } from "react";
import { ArrowUpRight, ArrowRight, Search } from "lucide-react";
import PageIntro from "../../components/PageIntro";
import JournalContext from "../../context/JournalContext";
import { Link } from "../../lib/navigation";
import HomeSidebar from "../home/HomeSidebar";
import subjects from "./subject-areas.json";
import "./subject-area.css";
export default function SubjectAreaPage() {
  const journal = useContext(JournalContext).data?.journal;
  const [search, setSearch] = useState("");
  const filtered = subjects.filter((subject) =>
    subject.toLowerCase().includes(search.trim().toLowerCase()),
  );
  return (
    <main className="subject-area-page">
      <PageIntro
        label="JOURNAL SCOPE"
        title="Subject Areas"
        description="Explore the computing and information technology fields covered by IJCSITR."
      />
      <div className="container jt-content">
        <div className="row gx-lg-5 gy-4">
          <div className="col-lg-8 jt-maincol">
            <section className="jt-section subject-area-section">
              <div className="jt-section-head">
                <h2>Research areas covered by IJCSITR</h2>
              </div>
              <p>
                The journal welcomes work across computer science, information
                technology and related disciplines. Its coverage includes the
                subjects below and is not limited to this list.
              </p>
              <div className="subject-area-search">
                <Search size={18} aria-hidden="true" />
                <input
                  type="search"
                  className="form-control"
                  aria-label="Search subject areas"
                  placeholder="Find a subject area..."
                  value={search}
                  maxLength={200}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <p className="subject-area-count" role="status">
                {filtered.length} of {subjects.length} subject areas
              </p>
              {filtered.length ? (
                <ul className="subject-area-list">
                  {filtered.map((subject) => (
                    <li key={subject}>
                      <Link
                        to={`/articles?q=${encodeURIComponent(subject)}&sort=relevance`}
                      >
                        <span>{subject}</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="subject-area-empty">
                  <h3>No matching subject areas</h3>
                  <p>Try another term or browse the complete list.</p>
                  <button
                    className="btn button outline"
                    onClick={() => setSearch("")}
                  >
                    Clear search
                  </button>
                </div>
              )}
              <a
                className="jt-text-link subject-area-source"
                href="https://ijcsitr.com/subjectarea"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source: IJCSITR Subject Areas <ArrowUpRight size={15} />
              </a>
            </section>
          </div>
          <HomeSidebar
            journal={journal}
            email={journal?.email || "editor@ijcsitr.com"}
          />
        </div>
      </div>
    </main>
  );
}
