"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../../lib/navigation";
import State from "../../../components/State";
import adminApi from "../../../services/adminApi";
import JournalIssueForm from "./JournalIssueForm";
export default function EditJournalIssuePage() {
  const [params] = useSearchParams(),
    id = params.get("id"),
    navigate = useNavigate();
  const valid = /^[1-9]\d*$/.test(id || "") && Number.isSafeInteger(Number(id));
  const [state, setState] = useState<any>({ loading: true }),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/journal-issues/" + id, { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [id, valid, retry]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/journal-issue">
        Back to journal issues
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / JOURNAL ISSUE / EDIT</span>
          <h1>Edit journal issue</h1>
          <p>Update issue details.</p>
        </div>
      </div>
      {!valid ? (
        <div className="alert alert-warning">
          Choose an issue from the list to edit.
        </div>
      ) : (
        <State {...state} retry={() => setRetry((value) => value + 1)}>
          {state.data && (
            <JournalIssueForm
              key={id}
              issue={state.data.issue}
              onCancel={() => navigate("/portal/admin/journal-issue")}
              onSaved={(notice) =>
                navigate("/portal/admin/journal-issue", { state: { notice } })
              }
            />
          )}
        </State>
      )}
    </>
  );
}
