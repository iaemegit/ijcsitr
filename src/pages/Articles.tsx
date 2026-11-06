"use client";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import { Link, useSearchParams } from "../lib/navigation";
import ArticleCard from "../components/ArticleCard";
import Empty from "../components/Empty";
import PageIntro from "../components/PageIntro";
import State from "../components/State";
import JournalContext from "../context/JournalContext";
import useApi from "../hooks/useApi";
import "./article-library.css";
function Articles() {
  const [params, setParams] = useSearchParams();
  const journal = useContext(JournalContext).data;
  const q = params.get("q") || "";
  const [input, setInput] = useState<any>(q);
  useEffect(() => setInput(q), [q]);
  const state = useApi("/articles?" + params.toString());
  const update = (key, value) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    if (key !== "page") next.delete("page");
    setParams(next);
  };
  const reset = () => setParams({});
  const page = Number(params.get("page") || 1);
  const total = state.data?.total || 0;
  const pages = Math.ceil(total / (state.data?.limit || 6));
  return (
    <main className="article-library-page">
      <PageIntro
        label="RESEARCH LIBRARY"
        title="Articles & issues"
        description="Find your next idea in our collection of original work."
      />
      <section className="container library-layout section">
        <aside className="filters">
          <div className="filter-heading">
            <h3>
              <SlidersHorizontal size={17} /> Refine your search
            </h3>
            <button className="quiet-button btn" onClick={reset}>
              Reset
            </button>
          </div>
          <label className="field-label">
            PUBLICATION YEAR
            <select
              value={params.get("year") || ""}
              onChange={(e) => update("year", e.target.value)}
              className="form-select"
            >
              <option value="">All years</option>
              {journal?.years.map((y) => (
                <option key={y}>{y}</option>
              ))}
            </select>
          </label>
          <label className="field-label">
            VOLUME
            <input
              type="number"
              min="1"
              max="9999"
              placeholder="All volumes"
              value={params.get("volume") || ""}
              onChange={(e) => update("volume", e.target.value)}
              className="form-control"
            />
          </label>
          <label className="field-label">
            ISSUE
            <input
              type="number"
              min="1"
              max="9999"
              placeholder="All issues"
              value={params.get("issue") || ""}
              onChange={(e) => update("issue", e.target.value)}
              className="form-control"
            />
          </label>
          <div className="filter-note">
            <BookOpen size={24} />
            <h4>Follow your curiosity.</h4>
            <p>
              Search by title, author, or keyword to discover connections across
              the journal.
            </p>
            <Link to="/archives">
              Browse by issue <ArrowRight size={14} />
            </Link>
          </div>
        </aside>
        <div className="library-results">
          <form
            className="search-box library-search"
            onSubmit={(e) => {
              e.preventDefault();
              const next = new URLSearchParams(params);
              input.trim() ? next.set("q", input.trim()) : next.delete("q");
              next.set("sort", input.trim() ? "relevance" : "newest");
              next.delete("page");
              setParams(next);
            }}
          >
            <Search size={19} />
            <input
              aria-label="Search articles"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search articles, authors, or keywords…"
              maxLength={250}
              className="form-control"
            />
            <button aria-label="Run search" className="btn">
              <ArrowRight size={20} />
            </button>
          </form>
          <div className="results-toolbar">
            <span>
              {state.loading ? (
                "Finding research…"
              ) : (
                <>
                  <b>{total}</b> {q ? `results for “${q}”` : "articles"}
                  {params.get("year") && ` · ${params.get("year")}`}
                </>
              )}
            </span>
            <label>
              Sort by{" "}
              <select
                aria-label="Sort articles"
                value={params.get("sort") || "newest"}
                onChange={(e) => update("sort", e.target.value)}
                className="form-select"
              >
                {q && <option value="relevance">Relevance</option>}
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
                <option value="popular">Most viewed</option>
              </select>
            </label>
          </div>
          <State {...state}>
            {total > 0 ? (
              <>
                <div className="article-grid results-grid">
                  {state.data?.articles.map((a) => (
                    <ArticleCard key={a.article_id} article={a} />
                  ))}
                </div>
                <div className="pagination align-items-center">
                  <span>
                    Page {page} of {pages}
                  </span>
                  <div>
                    <button
                      className="icon-button btn"
                      aria-label="Previous page"
                      disabled={page <= 1}
                      onClick={() => update("page", String(page - 1))}
                    >
                      <ChevronLeft size={19} />
                    </button>
                    {Array.from(
                      {
                        length: Math.min(pages, 5),
                      },
                      (_, i) =>
                        Math.min(
                          Math.max(page - 2, 1),
                          Math.max(pages - 4, 1),
                        ) + i,
                    ).map((p) => (
                      <button
                        key={p}
                        className={
                          page === p ? "page-button active" : "page-button"
                        }
                        onClick={() => update("page", String(p))}
                      >
                        {p}
                      </button>
                    ))}
                    <button
                      className="icon-button btn"
                      aria-label="Next page"
                      disabled={page >= pages}
                      onClick={() => update("page", String(page + 1))}
                    >
                      <ChevronRight size={19} />
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <Empty
                title="No articles found"
                text="Try a broader keyword or remove a filter."
                action={
                  <button className="button btn" onClick={reset}>
                    Clear filters <ArrowRight size={16} />
                  </button>
                }
              />
            )}
          </State>
        </div>
      </section>
    </main>
  );
}
export default Articles;
