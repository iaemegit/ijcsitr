"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, BookOpen } from "lucide-react";
import PageIntro from "../components/PageIntro";
import State from "../components/State";
import useApi from "../hooks/useApi";
import ArchiveIssueContents from "./archives/ArchiveIssueContents";
import type { ArchiveIssue } from "./archives/archive-types";
import "./archives.css";
export default function Archives() {
  const state = useApi<{ issues: ArchiveIssue[] }>("/issues");
  const params = useSearchParams(),
    router = useRouter();
  const [expanded, setExpanded] = useState<string | null>(null);
  const all = state.data?.issues || [];
  const selected =
    all.find((v) => String(v.issue_id) === params?.get("issue")) || all[0];
  const groupKey = (v: ArchiveIssue) => `${v.year}-${v.volume_no}`;
  const groups = [...new Set(all.map(groupKey))].map((key) => ({
    key,
    issues: all.filter((v) => groupKey(v) === key),
  }));
  function select(issue: ArchiveIssue) {
    setExpanded(groupKey(issue));
    router.replace(
      "/archives?" + new URLSearchParams({ issue: String(issue.issue_id) }),
      { scroll: false },
    );
  }
  return (
    <main className="archive-page">
      <PageIntro
        label="JOURNAL COLLECTION"
        title="Journal Archives"
        description="Explore the archive and read the articles in each published issue."
      />
      <section className="container archive-collection">
        <State {...state}>
          <div className="archive-browser">
            <aside className="archive-year-panel" aria-label="Archive issues">
              <div className="archive-navigation-title">
                <BookOpen size={21} />
                <h2>Browse the archive</h2>
              </div>
              <p>{all.length} published issues</p>
              <nav aria-label="Volumes and issues" className="archive-volumes">
                {groups.map((group) => {
                  const first = group.issues[0],
                    open =
                      expanded === null
                        ? selected && group.key === groupKey(selected)
                        : expanded === group.key;
                  return (
                    <div className="archive-volume-group" key={group.key}>
                      <button
                        className="archive-volume-toggle"
                        type="button"
                        aria-expanded={!!open}
                        aria-controls={"volume-" + group.key}
                        onClick={() => setExpanded(open ? "" : group.key)}
                      >
                        <span>
                          <strong>{first.year}</strong>
                          <small>Volume {first.volume_no}</small>
                        </span>
                        <ChevronDown
                          size={16}
                          className={open ? "is-expanded" : ""}
                        />
                      </button>
                      {open && (
                        <div
                          id={"volume-" + group.key}
                          className="archive-volume-issues"
                        >
                          {group.issues.map((v) => (
                            <button
                              type="button"
                              key={v.issue_id}
                              className={
                                "issue-card archive-issue-select " +
                                (selected?.issue_id === v.issue_id
                                  ? "active"
                                  : "")
                              }
                              aria-pressed={selected?.issue_id === v.issue_id}
                              onClick={() => select(v)}
                            >
                              <span>
                                Issue {v.issue_no}
                                <small>
                                  {[
                                    v.from_month,
                                    v.to_month !== v.from_month
                                      ? v.to_month
                                      : "",
                                  ]
                                    .filter(Boolean)
                                    .join(" - ")}
                                </small>
                              </span>
                              <span className="archive-count">
                                {v.article_count}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </aside>
            <div className="archive-results">
              {selected ? (
                <ArchiveIssueContents
                  key={selected.issue_id}
                  issue={selected}
                />
              ) : (
                <div className="archive-no-match">
                  No published issues are available.
                </div>
              )}
            </div>
          </div>
        </State>
      </section>
    </main>
  );
}
