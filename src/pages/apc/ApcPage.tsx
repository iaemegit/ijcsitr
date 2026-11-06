"use client";
import { useContext } from "react";
import { ArrowUpRight } from "lucide-react";
import PageIntro from "../../components/PageIntro";
import JournalContext from "../../context/JournalContext";
import { Link } from "../../lib/navigation";
import HomeSidebar from "../home/HomeSidebar";
import "./apc.css";
export default function ApcPage() {
  const journal = useContext(JournalContext).data?.journal;
  return (
    <main className="compact-info-page">
      <PageIntro
        label="PUBLICATION INFORMATION"
        title="Article Processing Charges (APC)"
        description="Publication fees, included services and payment guidance."
      />
      <div className="container jt-content">
        <div className="row gx-lg-5 gy-4">
          <div className="col-lg-8 jt-maincol apc-content">
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>APC details</h2>
              </div>
              <p>
                IJCSITR publishes openly accessible articles under the{" "}
                <a
                  href="https://creativecommons.org/licenses/by/4.0/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Creative Commons Attribution 4.0 licence
                </a>
                . Readers can access published work without charge. Publication
                fees support the journal’s publishing services.
              </p>
              <div className="apc-fees" aria-label="Online publication fees">
                <div>
                  <span>Indian authors</span>
                  <strong>₹7,500</strong>
                  <small>Online publication</small>
                </div>
                <div>
                  <span>Foreign authors</span>
                  <strong>US$150</strong>
                  <small>Online publication</small>
                </div>
              </div>
              <h3>What the fee supports</h3>
              <ul className="apc-services">
                <li>
                  <strong>Editorial support:</strong> review coordination,
                  administration and journal development.
                </li>
                <li>
                  <strong>Publishing technology:</strong> journal platforms,
                  website operations and maintenance.
                </li>
                <li>
                  <strong>Production:</strong> article formatting, markup and
                  indexing preparation.
                </li>
                <li>
                  <strong>Promotion:</strong> helping readers discover published
                  research.
                </li>
                <li>
                  <strong>Author assistance:</strong> support for authors and
                  readers.
                </li>
              </ul>
            </section>
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>Submitting your manuscript</h2>
              </div>
              <p>
                Follow the author guidelines and submit{" "}
                <Link to="/submit">online</Link> or email{" "}
                <a href="mailto:editor@ijcsitr.com">editor@ijcsitr.com</a> /{" "}
                <a href="mailto:ijcsitr@gmail.com">ijcsitr@gmail.com</a>.
                Manuscripts undergo expert peer review.
              </p>
              <Link className="jt-primary-btn" to="/submit">
                View author guidelines <ArrowUpRight size={16} />
              </Link>
            </section>
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>Payment arrangements</h2>
              </div>
              <p>
                The corresponding or submitting author arranges payment after
                editorial acceptance. Funding may come from the author,
                institution, employer or research funder.
              </p>
              <p>
                Publication follows formatting checks and payment receipt.
                Available methods include online transfer, UPI, GPay, Paytm and
                PhonePe.
              </p>
              <p>
                For payment enquiries, contact{" "}
                <a href="mailto:ijcsitr@gmail.com">ijcsitr@gmail.com</a>.
              </p>
              <a
                className="jt-text-link"
                href="https://ijcsitr.com/apc"
                target="_blank"
                rel="noopener noreferrer"
              >
                Original APC policy <ArrowUpRight size={15} />
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
