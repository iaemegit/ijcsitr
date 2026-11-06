"use client";
import { ArrowUpRight } from "lucide-react";
import { useContext } from "react";
import { Link } from "../lib/navigation";
import HomeSidebar from "./home/HomeSidebar";
import PageIntro from "../components/PageIntro";
import State from "../components/State";
import JournalContext from "../context/JournalContext";
import AboutAimScope from "./about/AboutAimScope";
function About() {
  const state = useContext(JournalContext);
  return (
    <main>
      <PageIntro
        label="ABOUT IJCSITR"
        title="About the journal"
        description="International Journal of Computer Science and Information Technology Research"
      />
      <div className="container jt-content">
        <div className="row gx-lg-5 gy-4">
          <div className="col-lg-8 prose jt-maincol">
            <section className="jt-section">
              <span className="eyebrow muted">OUR JOURNAL</span>
              <div className="jt-section-head">
                <h2>A forum for computing research</h2>
              </div>
              <State {...state}>
                <p>
                  {state.data?.journal.about_us ||
                    "IJCSITR is a journal for original contributions in computer science and information technology research. Explore published work and connect with our editorial community."}
                </p>
              </State>
            </section>
            <AboutAimScope />
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>Contribute to the journal</h2>
              </div>
              <p>
                Authors can submit a complete manuscript for editorial review.
                Please include author details, an abstract, keywords, a clear
                methodology, and references.
              </p>
              <Link className="button btn" to="/submit">
                Submit your research <ArrowUpRight size={17} />
              </Link>
            </section>
          </div>
          <HomeSidebar
            journal={state.data?.journal}
            email={state.data?.journal.email || "editor@ijcsitr.com"}
          />
        </div>
      </div>
    </main>
  );
}
export default About;
