"use client";
import { ArrowUpRight, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { useState } from "react";
import Empty from "../components/Empty";
import PageIntro from "../components/PageIntro";
import State from "../components/State";
import useApi from "../hooks/useApi";
import "./editors.css";
function Editors() {
  const state = useApi("/editors");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const editors =
    state.data?.editors.filter((v) =>
      (v.name + " " + v.affiliation + " " + v.role)
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];
  const pages = Math.ceil(editors.length / 18);
  return (
    <main className="editorial-board-page">
      <PageIntro
        label="OUR EDITORIAL COMMUNITY"
        title="The minds behind the journal"
        description="Researchers and academics bringing their experience to the conversation."
      />
      <section className="container section">
        <div className="editor-toolbar">
          <span>{editors.length} editorial members</span>
          <div className="search-box">
            <Search size={18} />
            <input
              aria-label="Search editorial members"
              placeholder="Search a name or institution…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-control"
            />
          </div>
        </div>
        <State {...state}>
          <div className="editor-grid">
            {editors.slice((page - 1) * 18, page * 18).map((v) => (
              <article
                className={
                  "editor-card " + (v.role === "Editor-in-Chief" ? "chief" : "")
                }
                key={v.id}
              >
                <div className="editor-card-top">
                  <span className="avatar">
                    {v.name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")}
                  </span>
                  <span className="role-label">{v.role}</span>
                </div>
                <h3>
                  {v.prefix} {v.name}
                </h3>
                <p>{v.affiliation}</p>
                {v.profile && (
                  <a
                    className="text-link"
                    href={v.profile}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Academic profile <ArrowUpRight size={14} />
                  </a>
                )}
              </article>
            ))}
          </div>
          {!editors.length && (
            <Empty
              title="No matching members"
              text="Try another name or institution."
            />
          )}
          {pages > 1 && (
            <div className="pagination align-items-center">
              <span>
                Page {page} of {pages}
              </span>
              <div>
                <button
                  className="button outline small btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <button
                  className="button outline small btn"
                  disabled={page >= pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </State>
      </section>
    </main>
  );
}
export default Editors;
