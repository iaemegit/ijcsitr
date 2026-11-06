import PublishingPageLayout from "../../components/PublishingPageLayout";
import { Link } from "../../lib/navigation";

const reasons = [
  [
    "Scholarly quality",
    "A focus on theoretical, experimental and applied contributions in computing.",
  ],
  [
    "Double-blind peer review",
    "Independent assessment supports originality, relevance and methodological quality.",
  ],
  [
    "Interdisciplinary coverage",
    "Research spans computer science, engineering and related technology fields.",
  ],
  [
    "Open-access readership",
    "Published articles can reach readers across academic, industrial and public settings.",
  ],
  [
    "Research discovery",
    "The journal lists academic databases and platforms that support discoverability.",
  ],
  [
    "Editorial communication",
    "Authors receive guidance throughout assessment, revision and publication.",
  ],
  [
    "Editorial expertise",
    "Academic and industry perspectives inform manuscript evaluation.",
  ],
  [
    "Publishing ethics",
    "Responsible authorship and transparent scholarly communication underpin publication.",
  ],
];
export default function WhyPublishPage() {
  return (
    <PublishingPageLayout
      title="Why Publish With Us?"
      description="Share your research with the IJCSITR scholarly community."
      source="https://www.ijcsitr.com/whypublishwithus"
    >
      <h2>Why choose IJCSITR?</h2>
      <p>
        Established in 2020, IJCSITR provides a platform for researchers,
        academics and industry professionals to communicate advances in computer
        science and information technology.
      </p>
      <ol className="publishing-steps">
        {reasons.map(([title, description]) => (
          <li key={title}>
            <h3>{title}</h3>
            <p>{description}</p>
          </li>
        ))}
      </ol>
      <Link to="/authorguidelines" className="jt-primary-btn">
        Read author guidelines
      </Link>
    </PublishingPageLayout>
  );
}
