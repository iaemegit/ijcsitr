import {
  ArrowUpRight,
  ShieldCheck,
  FileCheck2,
  LockKeyhole,
} from "lucide-react";
import { Link } from "../../lib/navigation";
import "./home-policy-cards.css";

const policies = [
  { title: "Editorial Policy", to: "/editorpolicy", Icon: FileCheck2 },
  {
    title: "Publication Ethics & Plagiarism Policy",
    to: "/publicationethics",
    Icon: ShieldCheck,
  },
  { title: "Privacy Statement", to: "/privacystatement", Icon: LockKeyhole },
];

export default function HomePolicyCards() {
  return (
    <nav className="home-policy-cards" aria-label="Journal policies">
      {policies.map(({ title, to, Icon }) => (
        <Link key={to} to={to} className="card home-policy-card">
          <Icon className="home-policy-icon" size={24} aria-hidden="true" />
          <span>{title}</span>
          <ArrowUpRight
            className="home-policy-arrow"
            size={18}
            aria-hidden="true"
          />
        </Link>
      ))}
    </nav>
  );
}
