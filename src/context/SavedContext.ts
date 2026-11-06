import { createContext } from "react";
import type { SavedArticle } from "../types/api";
const SavedContext = createContext<{
  saved: SavedArticle[];
  toggleSaved: (article: {
    article_id: number;
    article_title: string;
    year: string;
  }) => void;
}>({ saved: [], toggleSaved: () => {} });
export default SavedContext;
