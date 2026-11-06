"use client";

import { useContext } from "react";
import { ArrowUpRight, BookOpen, Search } from "lucide-react";
import PageIntro from "../../components/PageIntro";
import JournalContext from "../../context/JournalContext";
import HomeSidebar from "../home/HomeSidebar";
import "./indexing.css";

const platforms = [
  ["Google Scholar", "Academic search engine"],
  ["Scope Database", "Multidisciplinary research database"],
  ["ResearchGate", "Professional network for researchers"],
  ["Academia", "Research paper sharing platform"],
  [
    "SSRN (Social Science Research Network)",
    "Research repository supporting interdisciplinary exchange",
  ],
];

const benefits = [
  [
    "Enhanced discoverability",
    "Help readers find and cite relevant research through databases and search engines.",
  ],
  [
    "Increased visibility",
    "Introduce research to a wider international readership through concise abstracts.",
  ],
  [
    "Facilitated retrieval",
    "Organize articles by subject so readers can navigate research efficiently.",
  ],
  [
    "Quality assurance",
    "Inclusion in reputable databases can support confidence in scholarly publications.",
  ],
];

export default function IndexingPage() {
  const journal = useContext(JournalContext).data?.journal;

  return (
    <main>
      <PageIntro
        label="RESEARCH DISCOVERY"
        title="Indexing and Abstracting"
        description="Supporting the discovery, accessibility and visibility of IJCSITR research."
      />
      <div className="container jt-content">
        <div className="row gx-lg-5 gy-4">
          <div className="col-lg-8 jt-maincol">
            <section className="jt-section indexing-overview">
              <div className="jt-section-head">
                <h2>What is indexing and abstracting?</h2>
              </div>
              <p>
                IJCSITR highlights indexing and abstracting as ways to connect
                computer science and information technology research with
                readers.
              </p>
              <div className="row g-3">
                <div className="col-md-6">
                  <div className="indexing-definition">
                    <Search size={23} aria-hidden="true" />
                    <h3>Indexing</h3>
                    <p>
                      Organizes articles by keywords, authors and topics to make
                      relevant work easier to locate.
                    </p>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="indexing-definition">
                    <BookOpen size={23} aria-hidden="true" />
                    <h3>Abstracting</h3>
                    <p>
                      Summarizes findings, methods and significance so readers
                      can assess a paper’s relevance.
                    </p>
                  </div>
                </div>
              </div>
            </section>
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>Benefits for research</h2>
              </div>
              <ul className="indexing-benefits">
                {benefits.map(([title, description]) => (
                  <li key={title}>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </li>
                ))}
              </ul>
            </section>
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>Platforms listed by IJCSITR</h2>
              </div>
              <p>
                The journal’s indexing page lists the following databases,
                networks and repositories.
              </p>
              <ul className="indexing-platforms">
                {platforms.map(([name, description], index) => (
                  <li key={name}>
                    <span
                      className="indexing-platform-number"
                      aria-hidden="true"
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3>{name}</h3>
                      <p>{description}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <a
                className="jt-text-link indexing-source"
                href="https://ijcsitr.com/indexing"
                target="_blank"
                rel="noopener noreferrer"
              >
                Source: IJCSITR Indexing and Abstracting{" "}
                <ArrowUpRight size={15} aria-hidden="true" />
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
