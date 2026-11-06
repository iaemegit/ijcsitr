"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "../../../lib/navigation";
import { ArrowLeft } from "lucide-react";
import State from "../../../components/State";
import adminApi from "../../../services/adminApi";
import JournalForm from "./JournalForm";
export default function EditJournalPage() {
  const navigate = useNavigate(),
    [state, setState] = useState<any>({ loading: true }),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/journal", { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [retry]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/journal">
        <ArrowLeft size={15} /> Back to journal
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / JOURNAL / EDIT</span>
          <h1>Edit journal</h1>
          <p>Update your journal’s publication and contact details.</p>
        </div>
      </div>
      <State {...state} retry={() => setRetry((value) => value + 1)}>
        {state.data && (
          <JournalForm
            journal={state.data.journal}
            disciplines={state.data.disciplines}
            onCancel={() => navigate("/portal/admin/journal")}
            onSaved={(notice) =>
              navigate("/portal/admin/journal", { state: { notice } })
            }
          />
        )}
      </State>
    </>
  );
}
