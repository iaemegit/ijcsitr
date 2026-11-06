import { FileText } from "lucide-react";
import "./article-pdf-button.css";

export default function ArticlePdfButton({
  url,
  title,
}: {
  url?: string | null;
  title: string;
}) {
  return url ? (
    <a
      className="btn article-pdf-button"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open PDF: ${title}`}
    >
      <FileText size={16} aria-hidden="true" /> PDF
    </a>
  ) : (
    <span className="btn article-pdf-button disabled" aria-disabled="true" title="PDF not available">
      <FileText size={16} aria-hidden="true" /> PDF unavailable
    </span>
  );
}
