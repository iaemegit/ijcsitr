"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../../lib/navigation";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
import ArticleForm from "./ArticleForm";
import type { ArticleOptions, ArticleRecord } from "./article-types";
export default function EditArticlePage() {
  const navigate = useNavigate(),
    [params] = useSearchParams(),
    id = params.get("id"),
    valid = /^[1-9]\d*$/.test(id || "") && Number.isSafeInteger(Number(id));
  const [retry, setRetry] = useState(0),
    [state, setState] = useState<{
      data?: { options: ArticleOptions; article: ArticleRecord };
      loading: boolean;
      error?: string;
    }>({ loading: true });
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setState({ loading: true });
    Promise.all([
      adminApi("/articles/" + id, { signal: controller.signal }),
      adminApi("/articles/options", { signal: controller.signal }),
    ])
      .then(([record, options]) =>
        setState({
          data: { article: record.article, options },
          loading: false,
        }),
      )
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [id, valid, retry]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/article">
        Back to articles
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / ARTICLE / EDIT</span>
          <h1>Edit article</h1>
          <p>Update article details and publication status.</p>
        </div>
      </div>
      {!valid ? (
        <div className="alert alert-warning">
          Select an article from the list to edit.
        </div>
      ) : (
        <State {...state} retry={() => setRetry((value) => value + 1)}>
          {state.data && (
            <ArticleForm
              key={id}
              article={state.data.article}
              options={state.data.options}
              onCancel={() => navigate("/portal/admin/article")}
              onSaved={(notice) =>
                navigate("/portal/admin/article", { state: { notice } })
              }
            />
          )}
        </State>
      )}
    </>
  );
}
