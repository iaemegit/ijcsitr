"use client";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Download,
  ExternalLink,
  FileText,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "../lib/navigation";
import ArticleCard from "../components/ArticleCard";
import SaveButton from "../components/SaveButton";
import State from "../components/State";
import useApi from "../hooks/useApi";
import formatDate from "../utils/formatDate";
import JournalBreadcrumb from "../components/JournalBreadcrumb";
import "./article-details.css";
function Article() {
  const { id } = useParams();
  const state = useApi("/articles/" + id);
  const a = state.data?.article;
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  function citation() {
    return `${a.authors.map((v) => v.name).join(", ")} (${a.year}). ${a.article_title}. IJCSITR, ${a.volume}(${a.issue}), ${a.page_from}–${a.page_to}.${a.doi ? " " + a.doi : ""}`;
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(citation());
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
    }
  }
  function download() {
    const bib = `@article{ijcsitr${a.article_id},\n  title = {${a.article_title.replace(/[{}\\]/g, "")}},\n  author = {${a.authors.map((v) => v.name.replace(/[{}\\]/g, "")).join(" and ")}},\n  journal = {International Journal of Computer Science and Information Technology Research},\n  year = {${a.year}},\n  volume = {${a.volume}},\n  number = {${a.issue}},\n  pages = {${a.page_from}--${a.page_to}}\n}`;
    const url = URL.createObjectURL(
      new Blob([bib], {
        type: "application/x-bibtex",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `ijcsitr-${a.article_id}.bib`;
    link.click();
    URL.revokeObjectURL(url);
  }
  return (
    <main className="container article-page section">
      <JournalBreadcrumb title="Articles" />
      <Link className="back-link" to="/articles">
        <ArrowLeft size={15} /> Back to research
      </Link>
      <State {...state}>
        {a && (
          <>
            <div className="article-detail-grid">
              <article>
                <div className="detail-kicker">
                  <span className="article-type">
                    <span /> RESEARCH ARTICLE
                  </span>
                  <span>
                    Volume {a.volume} · Issue {a.issue} · {a.year}
                  </span>
                </div>
                <h1>{a.article_title}</h1>
                <div className="detail-authors">
                  {a.authors.map((v) => (
                    <div key={v.id}>
                      <strong>{v.name}</strong>
                      <span>{v.university}</span>
                    </div>
                  ))}
                </div>
                <div className="detail-meta">
                  <span>Published {formatDate(a.date_of_publication)}</span>
                  <span>
                    Pages {a.page_from}–{a.page_to}
                  </span>
                  {a.doi_url && (
                    <a href={a.doi_url} target="_blank" rel="noreferrer">
                      DOI <ExternalLink size={12} />
                    </a>
                  )}
                </div>
                <section className="abstract">
                  <h2>Abstract</h2>
                  <p>{a.abstract}</p>
                </section>
                <section className="keywords">
                  <h3>Keywords</h3>
                  <div>
                    {a.keywords
                      .split(/[,;]+/)
                      .filter(Boolean)
                      .slice(0, 15)
                      .map((k, i) => (
                        <Link
                          key={i}
                          to={
                            "/articles?q=" +
                            encodeURIComponent(k.trim()) +
                            "&sort=relevance"
                          }
                        >
                          {k.trim()}
                        </Link>
                      ))}
                  </div>
                </section>
                {a.reference && (
                  <section className="references">
                    <h2>References</h2>
                    <p>{a.reference}</p>
                  </section>
                )}
              </article>
              <aside className="article-sidebar">
                <div className="detail-action-panel">
                  <span className="eyebrow muted">READ. SAVE. SHARE.</span>
                  <h3>Take the research further.</h3>
                  {a.file_url ? (
                    <a
                      className="button"
                      href={a.file_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open PDF <ExternalLink size={16} />
                    </a>
                  ) : (
                    <p className="file-note">
                      <FileText size={18} /> The PDF is not available in the
                      migrated archive.
                    </p>
                  )}
                  <button className="button outline btn" onClick={download}>
                    Export citation <Download size={16} />
                  </button>
                  <button className="button outline btn" onClick={copy}>
                    {copied ? "Citation copied" : "Copy citation"}
                    {copied ? <Check size={16} /> : <Plus size={16} />}
                  </button>
                  {copyError && (
                    <p role="status" className="form-error">
                      Clipboard unavailable. Use Export citation instead.
                    </p>
                  )}
                  <div className="save-detail">
                    <SaveButton article={a} />
                    <span>Save to your reading list</span>
                  </div>
                  <div className="article-metrics">
                    <div>
                      <b>{Number(a.views || 0).toLocaleString()}</b>
                      <span>Views</span>
                    </div>
                    <div>
                      <b>{a.citation || 0}</b>
                      <span>Citations</span>
                    </div>
                  </div>
                </div>
                <p className="sidebar-footnote">
                  A contribution to the growing body of knowledge in computer
                  science and information technology.
                </p>
              </aside>
            </div>
            {state.data.related.length > 0 && (
              <section className="section related">
                <div className="section-heading">
                  <h2>Keep exploring</h2>
                  <Link className="text-link" to="/articles">
                    All research <ArrowUpRight size={16} />
                  </Link>
                </div>
                <div className="article-grid">
                  {state.data.related.map((v) => (
                    <ArticleCard key={v.article_id} article={v} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </State>
    </main>
  );
}
export default Article;
