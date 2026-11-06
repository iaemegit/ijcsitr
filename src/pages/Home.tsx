"use client";
import { useContext } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  Globe2,
  ShieldCheck,
  UnlockKeyhole,
} from "lucide-react";
import { Link } from "../lib/navigation";
import JournalContext from "../context/JournalContext";
import HomeSidebar from "./home/HomeSidebar";
import HomeAboutIntro from "./home/HomeAboutIntro";
import HomeIndexing from "./home/HomeIndexing";
import HomePolicyCards from "./home/HomePolicyCards";
import HomeContactCards from "./home/HomeContactCards";
import HomeWhyChoose from "./home/HomeWhyChoose";
import JournalBreadcrumb from "../components/JournalBreadcrumb";
import "./home/home.css";
import "./home/home-spacing.css";
export default function Home() {
  const state = useContext(JournalContext);
  const journal = state.data?.journal;
  const issue = state.data?.currentIssue;
  const title =
    journal?.journal_name ||
    "International Journal of Computer Science and Information Technology Research";
  const email = journal?.email || "editor@ijcsitr.com";
  return (
    <>
      <main id="home" className="jt-main">
        <section className="jt-masthead">
          <div className="container">
            <div className="jt-journal-layout">
              <div
                className="jt-cover"
                role="img"
                aria-label="Illustrative IJCSITR journal cover"
              >
                <span className="jt-cover-top">IJCSITR</span>
                <span className="jt-cover-bar" />
                <span className="jt-cover-name">
                  INTERNATIONAL JOURNAL OF COMPUTER SCIENCE AND INFORMATION
                  TECHNOLOGY RESEARCH
                </span>
                <small>
                  {issue
                    ? `VOLUME ${issue.volume_no} · ISSUE ${issue.issue_no} · ${issue.year}`
                    : "SCHOLARLY RESEARCH JOURNAL"}
                </small>
              </div>
              <div className="jt-masthead-copy">
                <JournalBreadcrumb title="IJCSITR" />
                <span className="jt-kicker">Research journal</span>
                <h1>Welcome to IJCSITR</h1>
                <p>
                  A peer-reviewed, open-access journal sharing original findings
                  and emerging perspectives across computer science, information
                  technology and their applications.
                </p>
                <div className="jt-chips">
                  <span>
                    <UnlockKeyhole size={14} /> Open access
                  </span>
                  <span>
                    <ShieldCheck size={14} /> Peer reviewed
                  </span>
                  <span>
                    <Globe2 size={14} /> International journal
                  </span>
                </div>
                <div className="jt-facts">
                  {journal?.start_year && (
                    <span>
                      <strong>Established:</strong> {journal.start_year}
                    </span>
                  )}
                  <span>
                    <strong>Subject:</strong> Computer Science &amp; IT
                  </span>
                  {journal?.issn_online && (
                    <span>
                      <strong>ISSN online:</strong> {journal.issn_online}
                    </span>
                  )}
                </div>
                <div className="jt-actions">
                  <Link className="jt-primary-btn" to="/submit">
                    Submit your paper <ArrowUpRight size={16} />
                  </Link>
                  <Link className="jt-outline-btn" to="/submit">
                    Guide for authors <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="rt-discovery" aria-labelledby="discover-research">
          <div className="container">
            <div className="rt-feature">
              <div>
                <span className="jt-kicker">Journals &amp; research</span>
                <h2 id="discover-research">
                  Discover research.
                  <br />
                  Advance your next idea.
                </h2>
                <p>
                  Explore original findings in computer science and information
                  technology. Connect with published scholarship, discover
                  research across disciplines, and share your work with the
                  journal community.
                </p>
                <Link to="/articles" className="rt-action-link">
                  Explore articles <ArrowRight size={18} />
                </Link>
              </div>
              <img
                src="/images/journal-publishing.jpg"
                alt="Researchers collaborating on digital research"
                width={1000}
                height={667}
              />
            </div>
            <HomeAboutIntro />
            <HomeWhyChoose />
            <div className="rt-resource-grid">
              {[
                [
                  "01",
                  "About IJCSITR",
                  "Learn about the journal and its research community.",
                  "/#about",
                ],
                [
                  "02",
                  "Articles & issues",
                  issue
                    ? `Explore Volume ${issue.volume_no}, Issue ${issue.issue_no} (${issue.year}) and the complete archive.`
                    : "Browse published articles and journal archives.",
                  "/articles",
                ],
                [
                  "03",
                  "Publish your research",
                  "Review the author guidelines and prepare your submission.",
                  "/submit",
                ],
              ].map(([number, label, description, to]) => (
                <Link key={to} to={to} className="rt-resource-card">
                  <span>{number}</span>
                  <h3>{label}</h3>
                  <p>{description}</p>
                  <ArrowUpRight size={22} />
                </Link>
              ))}
            </div>
          </div>
        </section>
        <div className="jt-subnav">
          <div className="container">
            <nav aria-label="Journal sections">
              <a href="#about">Journal overview</a>
              <Link to="/articles">Latest articles</Link>
              <Link to="/aimandscope">Aims and scope</Link>
              <a href="#authors">Publish with us</a>
              <Link to="/editorial-board">Editorial board</Link>
              <Link to="/archives">Journal archives</Link>
            </nav>
          </div>
        </div>
        <div className="jt-content">
          <div className="container">
            <div className="row gx-lg-5 gy-4">
              <div className="col-lg-8 jt-maincol">
                <section className="jt-section" id="about">
                  <div className="jt-section-head">
                    <h2>About the journal</h2>
                    <Link to="/#about">
                      View full details <ArrowRight size={15} />
                    </Link>
                  </div>
                  <p className="jt-about-lead">
                    {journal?.about_us
                      ? journal.about_us.length > 750
                        ? journal.about_us
                            .slice(0, 750)
                            .replace(/\s+\S*$/, "") + "…"
                        : journal.about_us
                      : `The ${title} provides a platform for researchers, academicians and professionals to communicate advances in computing. It brings together theoretical investigations, experimental research and practical applications.`}
                  </p>
                  <p>
                    The journal connects original scholarship across computing
                    with an emphasis on research quality and responsible
                    publication.
                  </p>
                  <ul className="jt-feature-list">
                    {[
                      "Dedicated computer science and IT scope",
                      "Open access to published research",
                      "Editorial assessment and peer review",
                      "A global research community",
                    ].map((text) => (
                      <li key={text}>
                        <CheckCircle2 size={17} />
                        <span>{text}</span>
                      </li>
                    ))}
                  </ul>
                </section>
                <section className="jt-section">
                  <div className="jt-section-head">
                    <h2>Publication standards</h2>
                    <Link to="/submit">
                      For authors <ArrowRight size={15} />
                    </Link>
                  </div>
                  <p>
                    Submit original research with proper citation, accurate
                    reporting, and disclosure of conflicts of interest. Prepare
                    a complete manuscript and review the submission requirements
                    before sending your work.
                  </p>
                  <Link className="jt-text-link" to="/editorial-board">
                    Meet the editorial board <ArrowRight size={15} />
                  </Link>
                  <HomePolicyCards />
                  <HomeContactCards />
                </section>
              </div>
              <HomeSidebar journal={journal} email={email} />
            </div>
          </div>
        </div>
        <HomeIndexing />
        <section className="jt-author-call" id="authors">
          <div className="container">
            <div className="row align-items-center g-3">
              <div className="col-lg-8">
                <h2>Publish your research with IJCSITR</h2>
                <p>
                  Before submitting, review the journal’s scope, author
                  requirements, and ethical standards.
                </p>
              </div>
              <div className="col-lg-4 text-lg-end">
                <Link className="jt-primary-btn" to="/submit">
                  Start with author guidelines <ArrowRight size={16} />
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="jt-steps">
          <div className="container">
            <h2>The editorial journey</h2>
            <div className="row g-4">
              {[
                ["Prepare", "Check suitability and manuscript requirements."],
                ["Submit", "Send original work through the submission page."],
                [
                  "Review",
                  "Editorial checks and peer review inform decisions.",
                ],
                ["Publish", "Accepted papers proceed to final production."],
              ].map(([name, description], index) => (
                <div className="col-sm-6 col-lg-3" key={name}>
                  <div className="jt-step">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h3>{name}</h3>
                      <p>{description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
