import PublishingPageLayout from "../../components/PublishingPageLayout";
import { Link } from "../../lib/navigation";

const requirements = [
  ["Article types", "Research articles, review articles and case studies"],
  ["Length", "No stated page limit"],
  ["File format", "Microsoft Word"],
  ["Font", "Times New Roman, 11 pt"],
  [
    "Front matter",
    "Title, author names, affiliations, funding and acknowledgements",
  ],
  [
    "Structure",
    "Abstract, keywords, introduction, literature review, methodology, results and discussion, conclusions, references and appendix",
  ],
  ["Abstract", "Maximum 300 words"],
  ["Keywords", "3–6 keywords"],
  ["Figures and tables", "Include within the main text"],
  ["References", "APA style"],
  ["Declaration", "Statement of originality"],
];
export default function AuthorGuidelinesPage() {
  return (
    <PublishingPageLayout
      title="Author Guidelines"
      description="Prepare an original, clearly presented manuscript for IJCSITR."
      source="https://www.ijcsitr.com/authorguidelines"
    >
      <h2>Before submitting</h2>
      <p>
        Check that your manuscript fits the journal’s scope. Present the study
        design and argument clearly, with a concise title and a standalone
        abstract. Editorial screening precedes peer review.
      </p>
      <p>
        All authors must consent to submission. Obtain permissions for
        third-party materials and appropriate ethical approval where required.
      </p>
      <div className="table-responsive">
        <table className="table align-middle publishing-guidelines">
          <caption className="caption-top">
            Manuscript preparation summary
          </caption>
          <thead>
            <tr>
              <th scope="col">Item</th>
              <th scope="col">Requirement</th>
            </tr>
          </thead>
          <tbody>
            {requirements.map(([label, value]) => (
              <tr key={label}>
                <th scope="row">{label}</th>
                <td>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <h3>Submit your manuscript</h3>
      <p>
        Use the submission page or contact{" "}
        <a href="mailto:editor@ijcsitr.com">editor@ijcsitr.com</a> for
        submission enquiries.
      </p>
      <Link to="/submit" className="jt-primary-btn">
        Go to submission page
      </Link>
    </PublishingPageLayout>
  );
}
