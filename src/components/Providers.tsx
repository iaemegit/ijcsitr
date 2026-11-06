"use client";
import { useState, useEffect } from "react";
import JournalContext from "../context/JournalContext";
import SavedContext from "../context/SavedContext";
import { NavigationProvider } from "../lib/navigation";
import useApi from "../hooks/useApi";
import type { SavedArticle, JournalPayload } from "../types/api";
export default function Providers({ children }: { children: React.ReactNode }) {
  const journal = useApi<JournalPayload>("/journal"),
    [saved, setSaved] = useState<SavedArticle[]>([]);
  useEffect(() => {
    try {
      const value = JSON.parse(localStorage.getItem("ijcsitr-saved") || "[]");
      if (Array.isArray(value))
        setSaved(
          value.filter(
            (row) => Number.isInteger(row.id) && typeof row.title === "string",
          ),
        );
    } catch {}
  }, []);
  function toggleSaved(article: {
    article_id: number;
    article_title: string;
    year: string;
  }) {
    setSaved((current) => {
      const next = current.some((row) => row.id === article.article_id)
        ? current.filter((row) => row.id !== article.article_id)
        : [
            ...current,
            {
              id: article.article_id,
              title: article.article_title,
              year: article.year,
            },
          ];
      try {
        localStorage.setItem("ijcsitr-saved", JSON.stringify(next));
      } catch {}
      return next;
    });
  }
  return (
    <NavigationProvider>
      <JournalContext.Provider value={journal}>
        <SavedContext.Provider value={{ saved, toggleSaved }}>
          {children}
        </SavedContext.Provider>
      </JournalContext.Provider>
    </NavigationProvider>
  );
}
