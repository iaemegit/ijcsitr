import { Link } from "../lib/navigation";

export default function JournalBreadcrumb({ title }: { title: string }) {
  return (
    <nav className="jt-crumb jt-intro-crumb" aria-label="Breadcrumb">
      <ol className="breadcrumb mb-0">
        <li className="breadcrumb-item">
          <Link to="/">Home</Link>
        </li>
        <li className="breadcrumb-item">Journals</li>
        <li className="breadcrumb-item active" aria-current="page">
          {title}
        </li>
      </ol>
    </nav>
  );
}
