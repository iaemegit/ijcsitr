import PublishingPageLayout from "../../components/PublishingPageLayout";

const steps = [
  [
    "Manuscript submission",
    "Submit a manuscript that follows the journal’s formatting and ethical requirements. Initial screening checks suitability for the journal.",
  ],
  [
    "Editorial assessment",
    "A subject editor assesses the manuscript’s research quality and readiness for external review.",
  ],
  [
    "Double-blind peer review",
    "Two or three independent specialists evaluate the research. Author and reviewer identities remain anonymous.",
  ],
  [
    "Editorial decision",
    "The editor considers reviewer feedback and communicates acceptance, minor revision, major revision or rejection, with comments.",
  ],
  [
    "Revision and resubmission",
    "Authors respond to reviewer comments point by point and submit revisions by the requested deadline. Further review may follow.",
  ],
  [
    "Acceptance and publication",
    "Approved manuscripts proceed through copyediting, typesetting and proof review before online publication.",
  ],
];
export default function PeerReviewPage() {
  return (
    <PublishingPageLayout
      title="Peer Review Process"
      description="How IJCSITR evaluates manuscripts through double-blind peer review."
      source="https://www.ijcsitr.com/peerreviewprocess"
    >
      <h2>From submission to publication</h2>
      <p>
        The journal’s review process aims to identify original, methodologically
        sound research and provide constructive feedback.
      </p>
      <ol className="publishing-steps">
        {steps.map(([title, description]) => (
          <li key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
      <h3>Research integrity</h3>
      <p>
        Authors, reviewers and editors are expected to uphold ethical standards
        throughout assessment and publication.
      </p>
    </PublishingPageLayout>
  );
}
