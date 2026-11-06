"use client";
import { ArrowRight, Search } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "../lib/navigation";
function SearchBox({ large = false, initial = "" }) {
  const [value, setValue] = useState<any>(initial);
  const navigate = useNavigate();
  return (
    <form
      className={`search-box ${large ? "large" : ""}`}
      onSubmit={(e) => {
        e.preventDefault();
        navigate(
          "/articles" +
            (value.trim()
              ? "?q=" + encodeURIComponent(value.trim()) + "&sort=relevance"
              : ""),
        );
      }}
    >
      <Search size={20} />
      <input
        aria-label="Search research"
        placeholder="Search articles, authors, or keywords…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        maxLength={250}
        className="form-control"
      />
      <button type="submit" aria-label="Search articles" className="btn">
        <ArrowRight size={21} />
      </button>
    </form>
  );
}
export default SearchBox;
