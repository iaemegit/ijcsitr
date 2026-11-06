"use client";
import { ArrowUpRight, BookOpen, X } from "lucide-react";
import { useContext } from "react";
import { Link } from "../lib/navigation";
import Empty from "../components/Empty";
import PageIntro from "../components/PageIntro";
import SavedContext from "../context/SavedContext";
function Saved() {
  const { saved, toggleSaved } = useContext(SavedContext);
  return (
    <main>
      <PageIntro
        label="YOUR READING LIST"
        title="A little space for big ideas"
        description="Articles saved in this browser, ready when you are."
      />
      <section className="container section saved-section">
        {saved.length ? (
          <div className="saved-list">
            {saved.map((a) => (
              <article key={a.id}>
                <BookOpen size={25} />
                <div>
                  <span className="eyebrow muted">
                    {a.year} · SAVED ARTICLE
                  </span>
                  <Link to={"/articles/" + a.id}>
                    <h3>{a.title}</h3>
                  </Link>
                </div>
                <button
                  className="icon-button btn"
                  aria-label="Remove from reading list"
                  onClick={() =>
                    toggleSaved({
                      article_id: a.id,
                      article_title: a.title,
                      year: a.year,
                    })
                  }
                >
                  <X size={18} />
                </button>
              </article>
            ))}
          </div>
        ) : (
          <Empty
            title="Your next read is waiting"
            text="Tap the bookmark on an article to keep it in your reading list."
            action={
              <Link className="button btn" to="/articles">
                Discover articles <ArrowUpRight size={17} />
              </Link>
            }
          />
        )}
      </section>
    </main>
  );
}
export default Saved;
