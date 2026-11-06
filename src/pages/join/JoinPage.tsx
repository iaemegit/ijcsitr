"use client";
import { useContext } from "react";
import PageIntro from "../../components/PageIntro";
import JournalContext from "../../context/JournalContext";
import HomeSidebar from "../home/HomeSidebar";
import ReviewerApplicationForm from "./ReviewerApplicationForm";
import "./join.css";
export default function JoinPage() {
  const journal = useContext(JournalContext).data?.journal;
  return (
    <main className="compact-info-page">
      <PageIntro
        label="REVIEWER COMMUNITY"
        title="Join"
        description="Contribute your expertise to the journal’s editorial and reviewer community."
      />
      <div className="container jt-content">
        <div className="row gx-lg-5 gy-4">
          <div className="col-lg-8 jt-maincol">
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>Join our editorial board</h2>
              </div>
              <p>
                IJCSITR welcomes applications from academics, researchers,
                scientists and industry specialists interested in editorial and
                peer-review work.
              </p>
              <p>
                Members help assess manuscripts within their expertise and
                uphold the journal’s scholarly quality and publication
                integrity.
              </p>
              <ReviewerApplicationForm />
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
