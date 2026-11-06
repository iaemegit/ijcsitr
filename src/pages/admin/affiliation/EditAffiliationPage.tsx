"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../../lib/navigation";
import { ArrowLeft } from "lucide-react";
import State from "../../../components/State";
import Empty from "../../../components/Empty";
import adminApi from "../../../services/adminApi";
import AffiliationForm from "./AffiliationForm";
export default function EditAffiliationPage() {
  const [params] = useSearchParams(),
    navigate = useNavigate(),
    id = params.get("id"),
    valid = /^[1-9]\d*$/.test(id || "") && Number.isSafeInteger(Number(id));
  const [state, setState] = useState<any>({ loading: true }),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/affiliations/" + id, { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [id, valid, retry]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/affiliation">
        <ArrowLeft size={15} /> Back to affiliations
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / AFFILIATION / EDIT</span>
          <h1>Edit affiliation</h1>
          <p>
            {valid
              ? `Update affiliation #${id}.`
              : "Select an affiliation from the list to edit."}
          </p>
        </div>
      </div>
      {valid ? (
        <State {...state} retry={() => setRetry((value) => value + 1)}>
          {state.data && (
            <AffiliationForm
              key={id}
              affiliation={state.data.affiliation}
              onCancel={() => navigate("/portal/admin/affiliation")}
              onSaved={(notice) =>
                navigate("/portal/admin/affiliation", { state: { notice } })
              }
            />
          )}
        </State>
      ) : (
        <Empty
          title="Choose an affiliation to edit"
          text="Select Edit beside a record in the affiliation list."
          action={
            <Link className="btn button" to="/portal/admin/affiliation">
              View affiliations
            </Link>
          }
        />
      )}
    </>
  );
}
