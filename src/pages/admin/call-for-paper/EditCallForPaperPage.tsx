"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../../lib/navigation";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
import CallForPaperForm from "./CallForPaperForm";
import type { CallForPaperRecord } from "./call-for-paper-types";
export default function EditCallForPaperPage() {
  const navigate = useNavigate(),
    [params] = useSearchParams(),
    id = params.get("id"),
    valid = /^[1-9]\d*$/.test(id || "") && Number(id) <= 2147483647;
  const [retry, setRetry] = useState(0),
    [state, setState] = useState<{
      loading: boolean;
      error?: string;
      call?: CallForPaperRecord;
    }>({ loading: true });
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/calls-for-papers/" + id, { signal: controller.signal })
      .then((data) => setState({ loading: false, call: data.call }))
      .catch((err) => {
        if (err.name !== "AbortError")
          setState({ loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [id, valid, retry]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/call-for-paper">
        Back to calls for papers
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / CALL FOR PAPERS / EDIT</span>
          <h1>
            {valid
              ? "Edit Call for Papers"
              : "Choose a call for papers to edit"}
          </h1>
        </div>
      </div>
      {valid && (
        <State {...state} retry={() => setRetry((v) => v + 1)}>
          {state.call && (
            <CallForPaperForm
              key={state.call.call_id}
              call={state.call}
              onCancel={() => navigate("/portal/admin/call-for-paper")}
              onSaved={(notice) =>
                navigate("/portal/admin/call-for-paper", { state: { notice } })
              }
            />
          )}
        </State>
      )}
    </>
  );
}
