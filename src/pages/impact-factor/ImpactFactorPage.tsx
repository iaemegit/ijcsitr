"use client";
import { useContext } from "react";
import { ArrowUpRight } from "lucide-react";
import PageIntro from "../../components/PageIntro";
import JournalContext from "../../context/JournalContext";
import HomeSidebar from "../home/HomeSidebar";
import { impactFactors, impactFactorSource } from "./impact-factor-data";
import "./impact-factor.css";
export default function ImpactFactorPage() {
  const journal = useContext(JournalContext).data?.journal;
  return (
    <main className="compact-info-page">
      <PageIntro
        label="JOURNAL METRICS"
        title="Impact Factor"
        description="Journal-reported citation metrics based on Google Scholar."
      />
      <div className="container jt-content">
        <div className="row gx-lg-5 gy-4">
          <div className="col-lg-8 jt-maincol impact-factor-content">
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>Citation impact</h2>
              </div>
              <p>
                IJCSITR reports an impact metric calculated from Google Scholar
                citation data to describe the journal’s scholarly influence.
              </p>
              <div className="impact-factor-highlight">
                <span>Latest figure reported by the journal</span>
                <strong>{impactFactors[0].factor}</strong>
                <span>
                  {impactFactors[0].year} · Google Scholar citation data
                </span>
              </div>
            </section>
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>Calculation methodology</h2>
              </div>
              <p>The source page describes the following calculation:</p>
              <p className="impact-factor-formula">
                Impact factor = Total citations / Total citable items
              </p>
              <dl className="impact-factor-definitions">
                <div>
                  <dt>Total citations</dt>
                  <dd>
                    Citations received in the reporting year by IJCSITR articles
                    published in the preceding two years.
                  </dd>
                </div>
                <div>
                  <dt>Total citable items</dt>
                  <dd>
                    Citable publications appearing in IJCSITR during those same
                    two preceding years.
                  </dd>
                </div>
              </dl>
            </section>
            <section className="jt-section">
              <div className="jt-section-head">
                <h2>Impact factor over the years</h2>
              </div>
              <div className="table-responsive impact-factor-table-wrap">
                <table className="table align-middle mb-0 impact-factor-table">
                  <caption>
                    Figures reported on the IJCSITR Impact Factor page.
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Year</th>
                      <th scope="col">Impact factor based on Google Scholar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impactFactors.map((row) => (
                      <tr key={row.year}>
                        <th scope="row">{row.year}</th>
                        <td>{row.factor}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <a
                className="jt-text-link impact-factor-source"
                href={impactFactorSource}
                target="_blank"
                rel="noopener noreferrer"
              >
                Source: IJCSITR Impact Factor <ArrowUpRight size={15} />
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
