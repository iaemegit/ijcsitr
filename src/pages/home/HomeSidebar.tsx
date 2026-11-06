import { ArrowRight, ArrowUpRight, Mail, Info } from "lucide-react";
import { Link } from "../../lib/navigation";
import type { JournalPayload } from "../../types/api";
export default function HomeSidebar({
  journal,
  email,
}: {
  journal?: JournalPayload["journal"];
  email: string;
}) {
  const facts = [
    ["Journal acronym", "IJCSITR"],
    ["Established", journal?.start_year],
    ["Access model", "Open access"],
    ["Review model", "Peer reviewed"],
    ["ISSN online", journal?.issn_online],
    ["ISSN print", journal?.issn_print],
    ["Frequency", journal?.publication_frequency],
  ];
  return (
    <aside className="col-lg-4 jt-sidebar" aria-label="Journal information">
      <div className="jt-submitbox">
        <Link to="/submit" className="jt-primary-btn">
          Submit manuscript <ArrowUpRight size={16} />
        </Link>
        <Link to="/submit" className="jt-outline-btn">
          Guide for authors <ArrowRight size={16} />
        </Link>
        <small>
          <Info size={13} /> Review submission requirements before sending your
          manuscript.
        </small>
      </div>
      <div className="jt-side-section">
        <h3>Journal information</h3>
        {facts
          .filter(([, value]) => value)
          .map(([label, value]) => (
            <div className="jt-side-fact" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
      </div>
      <div className="jt-side-section">
        <h3>Information for authors</h3>
        <div className="jt-side-links">
          {[
            ["Author guidelines", "/submit"],
            ["Editorial board", "/editorial-board"],
            ["Journal scope", "/aimandscope"],
            ["Published research", "/articles"],
            ["Submission enquiries", "/contact"],
          ].map(([label, to]) => (
            <Link key={label} to={to}>
              {label}
              <ArrowRight size={14} />
            </Link>
          ))}
        </div>
      </div>
      <div className="jt-side-section">
        <h3>Explore the collection</h3>
        <p>
          Browse original research by publication year, volume, issue, or topic.
        </p>
        <Link to="/archives" className="jt-text-link">
          View journal archives <ArrowRight size={15} />
        </Link>
      </div>
      <div className="jt-contact">
        <h3>Editorial office</h3>
        <p>Contact the journal for submission and publication enquiries.</p>
        <a href={`mailto:${email}`}>
          <Mail size={14} /> {email}
        </a>
      </div>
    </aside>
  );
}
