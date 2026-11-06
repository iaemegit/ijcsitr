"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export default function HeaderSearch({ onSearch }: { onSearch: () => void }) {
  const [query, setQuery] = useState("");
  const router = useRouter();

  return (
    <form
      role="search"
      aria-label="Article search"
      className="jt-nav-search input-group"
      onSubmit={(event) => {
        event.preventDefault();
        const term = query.trim();
        if (!term) return;
        router.push(
          `/articles?${new URLSearchParams({ q: term, sort: "relevance" })}`,
        );
        onSearch();
      }}
    >
      <input
        type="search"
        className="form-control"
        aria-label="Search articles"
        placeholder="Search articles, authors, or keywords..."
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        maxLength={200}
        required
      />
      <button className="btn" type="submit" aria-label="Submit article search">
        <Search size={18} aria-hidden="true" />
      </button>
    </form>
  );
}
