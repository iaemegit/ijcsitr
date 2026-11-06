"use client";
import { ArrowUpRight } from "lucide-react";
import { Link } from "../lib/navigation";
import SaveButton from "./SaveButton";
import ArticlePdfButton from "./ArticlePdfButton";
function ArticleCard({ article: a, index = 0 }) {
  return (
    <article className="article-card card">
      <div className="card-top">
        <span className="article-type">
          <span /> RESEARCH ARTICLE
        </span>
        <SaveButton article={a} />
      </div>
      <div className="article-meta">
        {a.year}
        <span> / </span>VOL. {a.volume}, ISSUE {a.issue}
      </div>
      <Link to={"/articles/" + a.article_id} className="article-title">
        <h3>{a.article_title}</h3>
      </Link>
      <p className="article-authors">
        {a.authors.map((v) => v.name).join(", ") || "IJCSITR contributors"}
      </p>
      <p className="article-excerpt">{a.abstract}</p>
      <div className="card-bottom">
        <span>
          pp. {a.page_from}–{a.page_to}
        </span>
        <div className="d-flex align-items-center flex-wrap gap-3">
        <ArticlePdfButton url={a.file_url} title={a.article_title} />
        <Link to={"/articles/" + a.article_id}>
          Read article <ArrowUpRight size={16} />
        </Link>
        </div>
      </div>
    </article>
  );
}
export default ArticleCard;
