"use client";
import { Link, useNavigate } from "../../../lib/navigation";
import JournalIssueAddForm from "./JournalIssueAddForm";
import { useEffect, useState } from "react";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
export default function AddJournalIssuePage() {
  const navigate = useNavigate();
  const [state, setState] = useState<any>({ loading: true }),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/journal-issues/options", { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [retry]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/journal-issue">
        Back to journal issues
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / JOURNAL ISSUE / ADD</span>
          <h1>Add journal issue</h1>
          <p>Create an issue for your journal.</p>
        </div>
      </div>
      <State {...state} retry={() => setRetry((value) => value + 1)}>
        {state.data && (
          <JournalIssueAddForm
            journal={state.data.journal}
            onCancel={() => navigate("/portal/admin/journal-issue")}
            onSaved={(notice) =>
              navigate("/portal/admin/journal-issue", { state: { notice } })
            }
          />
        )}
      </State>
    </>
  );
}
