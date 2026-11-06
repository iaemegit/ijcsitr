import PublishingPageLayout from "../../components/PublishingPageLayout";
import "./publication-ethics.css";

export default function PublicationEthicsPage() {
  return (
    <PublishingPageLayout
      title="Publication Ethics & Plagiarism Policy"
      description="Ethical responsibilities and standards for research integrity at IJCSITR."
    >
      <div className="publication-ethics-content">
        <h2>Publication Ethics &amp; Plagiarism Policy of IJCSITR</h2>
        <p>
          The International Journal of Computer Science and Information
          Technology Research (IJCSITR) upholds the highest standards of ethical
          publishing and is firmly committed to promoting integrity,
          transparency, and accountability in the dissemination of scientific
          knowledge. Our ethical policies are aligned with the guidelines
          established by the Committee on Publication Ethics (COPE) and are
          binding on all stakeholders—authors, reviewers, editors, and
          publishers.
        </p>

        <section aria-labelledby="ethics-authors">
          <h3 id="ethics-authors">1. Ethical Responsibilities of Authors</h3>
          <p>Authors submitting to IJCSITR must ensure that their work:</p>
          <ul>
            <li>
              Is original, unpublished, and not under consideration elsewhere.
            </li>
            <li>Properly cites and acknowledges the work of others.</li>
            <li>
              Accurately represents data and results without fabrication,
              falsification, or misrepresentation.
            </li>
            <li>
              Lists all individuals who made significant contributions as
              co-authors and obtains their consent.
            </li>
            <li>Discloses any conflicts of interest or financial support.</li>
            <li>
              Complies with all relevant research ethics (e.g., informed
              consent, data protection) where human or animal subjects are
              involved.
            </li>
          </ul>
        </section>

        <section aria-labelledby="ethics-editors">
          <h3 id="ethics-editors">2. Responsibilities of Editors</h3>
          <p>Editors at IJCSITR:</p>
          <ul>
            <li>Ensure a fair and unbiased review process.</li>
            <li>
              Maintain confidentiality of manuscript content before publication.
            </li>
            <li>
              Make publication decisions based solely on merit, originality, and
              relevance.
            </li>
            <li>
              Act on ethical concerns or complaints regarding submitted or
              published work.
            </li>
            <li>
              Recuse themselves from handling manuscripts where a conflict of
              interest exists.
            </li>
          </ul>
        </section>

        <section aria-labelledby="ethics-reviewers">
          <h3 id="ethics-reviewers">3. Responsibilities of Reviewers</h3>
          <p>Peer reviewers play a critical role and are expected to:</p>
          <ul>
            <li>
              Evaluate manuscripts objectively, constructively, and
              confidentially.
            </li>
            <li>
              Declare any conflict of interest and decline to review if
              necessary.
            </li>
            <li>
              Avoid using unpublished information from the manuscript for
              personal advantage.
            </li>
            <li>
              Identify potential plagiarism, duplication, or ethical concerns in
              the manuscript.
            </li>
          </ul>
        </section>

        <section aria-labelledby="ethics-plagiarism">
          <h3 id="ethics-plagiarism">4. Plagiarism Policy</h3>
          <p>
            IJCSITR maintains a strict zero-tolerance policy toward plagiarism.
            All manuscripts are checked using reliable plagiarism detection
            tools before entering the peer review process.
          </p>
          <h4>What Constitutes Plagiarism:</h4>
          <ul>
            <li>
              Verbatim copying or close paraphrasing of substantial parts of
              another work without acknowledgment.
            </li>
            <li>
              Self-plagiarism or duplicate submission of the author&apos;s
              previously published work without proper citation.
            </li>
            <li>
              Improper attribution of ideas, data, or figures from other
              sources.
            </li>
          </ul>
          <div className="ethics-similarity-note">
            <h4>Permissible Similarity Threshold:</h4>
            <ul>
              <li>
                Manuscripts with more than 10% similarity (excluding references
                and commonly used phrases) will be automatically rejected or
                returned to the authors for correction.
              </li>
            </ul>
          </div>
        </section>

        <section aria-labelledby="ethics-misconduct">
          <h3 id="ethics-misconduct">5. Handling Misconduct</h3>
          <p>When plagiarism or research misconduct is suspected:</p>
          <ul>
            <li>The editorial office will conduct a formal investigation.</li>
            <li>Authors will be notified and given a chance to respond.</li>
            <li>
              If plagiarism is confirmed, the manuscript will be rejected or, if
              published, retracted with a public notice.
            </li>
            <li>
              Repeated or severe offenses may lead to a permanent ban from
              submitting to IJCSITR.
            </li>
          </ul>
        </section>

        <section aria-labelledby="ethics-corrections">
          <h3 id="ethics-corrections">6. Retraction &amp; Corrections</h3>
          <p>
            IJCSITR reserves the right to issue corrections, retractions, or
            expressions of concern for published articles if:
          </p>
          <ul>
            <li>
              Errors are discovered post-publication that affect the validity of
              the content.
            </li>
            <li>
              Evidence of plagiarism, duplicate publication, or unethical
              conduct emerges.
            </li>
            <li>The authors request a justified withdrawal or correction.</li>
          </ul>
        </section>

        <section aria-labelledby="ethics-conflicts">
          <h3 id="ethics-conflicts">7. Conflicts of Interest</h3>
          <p>
            Authors, reviewers, and editors are expected to disclose any
            financial, professional, or personal relationships that could
            influence the work or its evaluation. These disclosures ensure
            transparency and uphold the integrity of the scholarly record.
          </p>
        </section>

        <section aria-labelledby="ethics-data">
          <h3 id="ethics-data">8. Data Integrity and Reproducibility</h3>
          <p>
            Authors must retain raw data associated with their research and be
            prepared to provide it during the review process if requested.
            Transparency in methodology and data sharing is encouraged to
            promote reproducibility.
          </p>
        </section>

        <section aria-labelledby="ethics-integrity">
          <h3 id="ethics-integrity">Upholding Research Integrity</h3>
          <p>
            IJCSITR is dedicated to preserving the trust of the academic
            community. Ethical publishing is the foundation of responsible
            research dissemination, and all contributors are expected to uphold
            these standards to maintain the journal’s integrity and impact.
          </p>
        </section>

        <p>
          For further information, contact:
          <br />
          <strong>Editor-in-Chief</strong>
          <br />
          <a href="mailto:editor@ijcsitr.com">editor@ijcsitr.com</a> /{" "}
          <a href="mailto:ijcsitr@gmail.com">ijcsitr@gmail.com</a>
        </p>
      </div>
    </PublishingPageLayout>
  );
}
