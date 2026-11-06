import PublishingPageLayout from "../../components/PublishingPageLayout";
import "./editorial-policy.css";

const policies = [
  {
    title: "Editorial Independence",
    text: "IJCSITR’s editorial decisions are made independently of the journal’s publisher and are based solely on the scholarly merit of the submitted work. The Editor-in-Chief, Associate Editors, and Editorial Board Members are responsible for maintaining impartiality and objectivity in manuscript evaluation, free from external influence or conflict of interest.",
  },
  {
    title: "Editorial Responsibilities",
    text: "The editorial team is responsible for:",
    items: [
      "Upholding the journal’s scope and quality standards.",
      "Ensuring a timely and thorough peer review process.",
      "Maintaining confidentiality of submitted manuscripts.",
      "Making unbiased decisions based on reviewer feedback and ethical guidelines.",
      "Addressing ethical concerns such as plagiarism, duplicate submission, or misconduct.",
    ],
  },
  {
    title: "Peer Review Process",
    text: "IJCSITR follows a double-blind peer review process, where the identities of both authors and reviewers are concealed to ensure an unbiased and constructive evaluation. All manuscripts are reviewed by at least two qualified experts. The editorial team ensures that reviews are:",
    items: [
      "Objective and based on academic criteria.",
      "Delivered within a reasonable timeframe.",
      "Accompanied by actionable and respectful feedback.",
    ],
    conclusion:
      "Final publication decisions rest with the Editor-in-Chief, taking into account reviewer recommendations, originality, significance, and clarity.",
  },
  {
    title: "Manuscript Selection Criteria",
    text: "Manuscripts are evaluated based on the following criteria:",
    items: [
      "Alignment with the journal’s scope.",
      "Originality and novelty of the research.",
      "Scientific rigor and clarity of methodology.",
      "Quality of analysis and conclusions.",
      "Relevance and contribution to the field of computer science and engineering.",
    ],
  },
  {
    title: "Conflicts of Interest",
    text: "Editors, authors, and reviewers are expected to disclose any potential conflicts of interest. Editorial board members will not be involved in decisions about manuscripts in which they have a personal or professional interest.",
  },
  {
    title: "Plagiarism and Misconduct",
    text: "IJCSITR does not tolerate plagiarism, data fabrication, falsification, or any form of academic misconduct. All submitted manuscripts are screened for plagiarism. Submissions found in violation of ethical standards will be rejected or retracted as appropriate, following COPE (Committee on Publication Ethics) guidelines.",
  },
  {
    title: "Appeals and Complaints",
    text: "Authors may appeal editorial decisions by submitting a formal request to the Editor-in-Chief with detailed justification. Complaints regarding the editorial process or ethical concerns are investigated thoroughly and addressed in accordance with COPE best practices.",
  },
  {
    title: "Post-Publication Corrections and Retractions",
    text: "In cases of significant error, misconduct, or breach of ethical standards, IJCSITR may issue corrections, retractions, or expressions of concern. All such notices will be linked to the original article and clearly stated on the journal’s website.",
  },
  {
    title: "Diversity and Inclusivity",
    text: "IJCSITR supports diversity and inclusivity in academic publishing. The journal encourages submissions from authors of all nationalities, backgrounds, and career stages. Efforts are made to ensure diverse representation on the editorial board and among reviewers.",
  },
  {
    title: "Editorial Board Code of Conduct",
    text: "All members of the editorial board agree to:",
    items: [
      "Promote scholarly excellence and fair review practices.",
      "Avoid bias or favoritism in editorial decisions.",
      "Maintain confidentiality and act with academic integrity.",
      "Foster a culture of mutual respect and collaboration among authors, reviewers, and editors.",
    ],
  },
];

export default function EditorialPolicyPage() {
  return (
    <PublishingPageLayout
      title="Editorial Policy"
      description="Principles guiding fair assessment, research quality and responsible publication."
      source="https://www.ijcsitr.com/editorpolicy"
    >
      <h2>Editorial Policy of IJCSITR</h2>
      <p>
        The International Journal of Computer Science and Information Technology
        Research (IJCSITR) is committed to maintaining the highest standards of
        editorial integrity, scholarly quality, and ethical publishing
        practices. This policy outlines the responsibilities, processes, and
        guiding principles followed by the editorial team to ensure fairness,
        transparency, and academic rigor throughout the publication lifecycle.
      </p>
      <div className="editorial-policy-sections">
        {policies.map(({ title, text, items, conclusion }, index) => (
          <section
            key={title}
            aria-labelledby={`editorial-policy-${index + 1}`}
          >
            <h3 id={`editorial-policy-${index + 1}`}>
              {index + 1}. {title}
            </h3>
            <p>{text}</p>
            {items && (
              <ul>
                {items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            )}
            {conclusion && <p>{conclusion}</p>}
          </section>
        ))}
        <section aria-labelledby="editorial-commitment">
          <h3 id="editorial-commitment">Commitment to Excellence</h3>
          <p>
            IJCSITR continually strives to uphold a transparent, ethical, and
            academically sound editorial environment. We are dedicated to
            nurturing a vibrant scholarly community and ensuring the global
            dissemination of high-quality research.
          </p>
        </section>
      </div>
      <p>
        For further information, contact:
        <br />
        <strong>Editor-in-Chief</strong>
        <br />
        <a href="mailto:editor@ijcsitr.com">editor@ijcsitr.com</a> /{" "}
        <a href="mailto:ijcsitr@gmail.com">ijcsitr@gmail.com</a>
      </p>
    </PublishingPageLayout>
  );
}
