import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Database,
  FileCheck2,
  Globe2,
  Headphones,
  Languages,
  Link2,
  ListChecks,
  LockKeyhole,
  Search,
  Sparkles,
} from "lucide-react";
import "./home-why-choose.css";
import { Link } from "../../lib/navigation";

const benefits = [
  {
    Icon: Globe2,
    text: "Multidisciplinary research across all academic fields",
  },
  { Icon: Languages, text: "Support for publications in multiple languages" },
  { Icon: Link2, text: "Unique Crossref DOI for every paper" },
  { Icon: Database, text: "Indexing in major research databases" },
  { Icon: FileCheck2, text: "Fast and transparent review process" },
  { Icon: ListChecks, text: "Real-time review status tracking" },
  { Icon: Bell, text: "Automated email notifications" },
  { Icon: Headphones, text: "24/7 support via email, phone, and social media" },
  { Icon: LockKeyhole, text: "Secure HTTPS-SSL access" },
];

const resources = [
  {
    Icon: Search,
    title: "Indexing",
    description:
      "We are committed to advancing the dissemination of high-quality research in these fields.",
    href: "/indexing",
  },
  {
    Icon: FileCheck2,
    title: "Peer Review",
    description:
      "This process ensures that only original and impactful research contributions are published.",
    href: "/peerreviewprocess",
  },
  {
    Icon: Sparkles,
    title: "Why Publish With Us?",
    description:
      "We are committed to fostering innovation and amplifying the voice of researchers across the globe.",
    href: "/whypublishwithus",
  },
  {
    Icon: BookOpen,
    title: "Author Guidelines",
    description:
      "The IJCSITR welcomes original, high-quality manuscripts that contribute significantly.",
    href: "/authorguidelines",
  },
];

export default function HomeWhyChoose() {
  return (
    <section className="rt-why-choose" aria-labelledby="why-choose-heading">
      <h2 id="why-choose-heading">Why Choose IJCSITR?</h2>
      <ul className="rt-benefits-list row g-3">
        {benefits.map(({ Icon, text }) => (
          <li className="col-md-6 col-xl-4" key={text}>
            <div className="rt-benefit">
              <Icon size={21} aria-hidden="true" />
              <span>{text}</span>
            </div>
          </li>
        ))}
      </ul>
      <div className="row g-4 rt-publishing-resources">
        {resources.map(({ Icon, title, description, href }) => (
          <div className="col-md-6 col-xl-3" key={title}>
            <article className="card h-100 rt-publishing-card">
              <div className="rt-publishing-icon">
                <Icon size={24} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
              <Link
                to={href}
                className="rt-learn-more"
                aria-label={`Learn more about ${title}`}
              >
                Learn More <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </article>
          </div>
        ))}
      </div>
    </section>
  );
}
