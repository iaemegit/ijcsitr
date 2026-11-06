"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../lib/navigation";
import adminApi from "../../services/adminApi";
import State from "../State";
import ContentForm from "./ContentForm";
import type { ContentConfig, ContentRecord } from "./content-types";
export default function ContentEdit({ config }: { config: ContentConfig }) {
  const navigate = useNavigate(),
    [params] = useSearchParams(),
    id = params.get("id"),
    valid = /^[1-9]\d*$/.test(id || "") && Number(id) <= 2147483647,
    base = "/portal/admin/" + config.key;
  const [retry, setRetry] = useState(0),
    [state, setState] = useState<{
      loading: boolean;
      error?: string;
      record?: ContentRecord;
    }>({ loading: true });
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setState({ loading: true });
    adminApi(`/resources/${config.key}/${id}`, { signal: controller.signal })
      .then((data) => setState({ loading: false, record: data.record }))
      .catch((err) => {
        if (err.name !== "AbortError")
          setState({ loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [config.key, id, valid, retry]);
  return (
    <>
      <Link className="back-link" to={base}>
        Back to {config.title}
      </Link>
      <div className="admin-page-heading">
        <div>
          <h1>
            {valid
              ? `Review / Edit ${config.title}`
              : `Choose a ${config.singular} to review`}
          </h1>
        </div>
      </div>
      {valid && (
        <State {...state} retry={() => setRetry((v) => v + 1)}>
          {state.record && (
            <ContentForm
              key={String(state.record[config.id])}
              config={config}
              record={state.record}
              onCancel={() => navigate(base)}
              onSaved={(notice) => navigate(base, { state: { notice } })}
            />
          )}
        </State>
      )}
    </>
  );
}
