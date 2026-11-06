"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "../../../lib/navigation";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
import ArticleForm from "./ArticleForm";
import type { ArticleOptions } from "./article-types";
export default function AddArticlePage() {
  const navigate = useNavigate(),
    [retry, setRetry] = useState(0),
    [state, setState] = useState<{
      data?: ArticleOptions;
      loading: boolean;
      error?: string;
    }>({ loading: true });
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/articles/options", { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [retry]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/article">
        Back to articles
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / ARTICLE / ADD</span>
          <h1>Add article</h1>
          <p>
            Select the journal issue and authors, then enter the article
            details.
          </p>
        </div>
      </div>
      <State {...state} retry={() => setRetry((value) => value + 1)}>
        {state.data && (
          <ArticleForm
            options={state.data}
            onCancel={() => navigate("/portal/admin/article")}
            onSaved={(notice) =>
              navigate("/portal/admin/article", { state: { notice } })
            }
          />
        )}
      </State>
    </>
  );
}
