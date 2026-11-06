"use client";
import { useState } from "react";
import { ArrowRight, LibraryBig, Search } from "lucide-react";
import { Link } from "../../lib/navigation";
import ArticleCard from "../../components/ArticleCard";
import State from "../../components/State";
import type { ApiState, JournalPayload } from "../../types/api";
const tabs = ["Latest articles", "Volumes & issues", "Article search"];
export default function HomeArticleTabs({
  state,
}: {
  state: ApiState<JournalPayload>;
}) {
  const [tab, setTab] = useState(0);
  const issue = state.data?.currentIssue;
  return (
    <section className="jt-section" id="articles">
      <div className="jt-section-head">
        <h2>Articles &amp; issues</h2>
        <Link to="/archives">
          Explore all issues <ArrowRight size={15} />
        </Link>
      </div>
      <div className="jt-tabs" role="tablist" aria-label="Article collections">
        {tabs.map((name, index) => (
          <button
            key={name}
            type="button"
            role="tab"
            id={`collection-tab-${index}`}
            aria-selected={tab === index}
            aria-controls="home-article-panel"
            tabIndex={tab === index ? 0 : -1}
            onClick={() => setTab(index)}
            onKeyDown={(event) => {
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % tabs.length
                  : event.key === "ArrowLeft"
                    ? (index + tabs.length - 1) % tabs.length
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? tabs.length - 1
                        : null;
              if (next !== null) {
                event.preventDefault();
                setTab(next);
                document.getElementById(`collection-tab-${next}`)?.focus();
              }
            }}
          >
            {name}
          </button>
        ))}
      </div>
      <div
        className="jt-tabpanel"
        id="home-article-panel"
        role="tabpanel"
        aria-labelledby={`collection-tab-${tab}`}
        tabIndex={0}
      >
        <State {...state}>
          {tab === 0 ? (
            <>
              {state.data?.latest.length ? (
                <div className="article-grid">
                  {state.data.latest.map((article, index) => (
                    <ArticleCard
                      key={article.article_id}
                      article={article}
                      index={index}
                    />
                  ))}
                </div>
              ) : (
                <p>
                  No published articles yet. Please check back for new research.
                </p>
              )}
              <Link className="jt-text-link" to="/articles">
                Browse published articles <ArrowRight size={15} />
              </Link>
            </>
          ) : tab === 1 ? (
            <div className="jt-collection">
              <LibraryBig size={34} />
              <div>
                <small>Journal archives</small>
                <h3>
                  {issue
                    ? `Volume ${issue.volume_no}, Issue ${issue.issue_no} · ${issue.year}`
                    : "Explore volumes and issues"}
                </h3>
                <p>Discover the journal collection, issue by issue.</p>
                <div className="jt-year-links">
                  {state.data?.years.map((year) => (
                    <Link key={year} to={`/articles?year=${year}`}>
                      {year}
                    </Link>
                  ))}
                </div>
                <Link className="jt-text-link" to="/archives">
                  Browse all issues <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          ) : (
            <div className="jt-collection">
              <Search size={34} />
              <div>
                <h3>Find your next research paper</h3>
                <p>
                  Search titles, abstracts, keywords, and author names. Refine
                  results by publication year and issue.
                </p>
                <Link className="jt-text-link" to="/articles">
                  Open article search <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          )}
        </State>
      </div>
    </section>
  );
}
