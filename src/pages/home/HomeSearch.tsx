"use client";
import { useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "../../lib/navigation";
export default function HomeSearch() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  return (
    <div className="jt-finder" id="journal-search">
      <div>
        <h3>Search articles</h3>
        <p>Search the journal collection by title, author or keyword.</p>
      </div>
      <form
        className="input-group"
        role="search"
        aria-label="Search journal articles"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim())
            navigate(
              `/articles?q=${encodeURIComponent(query.trim())}&sort=relevance`,
            );
        }}
      >
        <input
          id="journalSearch"
          type="search"
          className="form-control"
          required
          maxLength={250}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search articles, authors, or keywords..."
          aria-label="Search articles, authors, or keywords"
        />
        <button type="submit" aria-label="Search">
          <Search size={18} aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
