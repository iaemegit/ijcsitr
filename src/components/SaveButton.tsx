"use client";
import { Bookmark } from "lucide-react";
import { useContext } from "react";
import SavedContext from "../context/SavedContext";
function SaveButton({ article }) {
  const { saved, toggleSaved } = useContext(SavedContext);
  const active = saved.some((a) => a.id === article.article_id);
  return (
    <button
      className={`icon-button save-button ${active ? "is-saved" : ""}`}
      onClick={() => toggleSaved(article)}
      aria-label={active ? "Remove saved article" : "Save article"}
      title={active ? "Remove from saved articles" : "Save for later"}
    >
      <Bookmark size={18} fill={active ? "currentColor" : "none"} />
    </button>
  );
}
export default SaveButton;
