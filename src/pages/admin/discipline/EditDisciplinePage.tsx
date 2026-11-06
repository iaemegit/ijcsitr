"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../../lib/navigation";
import { ArrowLeft } from "lucide-react";
import State from "../../../components/State";
import Empty from "../../../components/Empty";
import adminApi from "../../../services/adminApi";
import DisciplineForm from "./DisciplineForm";
import "./discipline.css";
export default function EditDisciplinePage() {
  const [params] = useSearchParams(),
    navigate = useNavigate(),
    id = params.get("id");
  const validId =
    /^[1-9]\d*$/.test(id || "") && Number.isSafeInteger(Number(id));
  const [state, setState] = useState<any>({ loading: true }),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!validId) return;
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/disciplines/" + id, { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [id, validId, attempt]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/discipline">
        <ArrowLeft size={15} /> Back to disciplines
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / DISCIPLINE / EDIT</span>
          <h1>Edit discipline</h1>
          <p>
            {validId
              ? `Update discipline #${id}.`
              : "Select the discipline you want to update."}
          </p>
        </div>
      </div>
      {validId ? (
        <State {...state} retry={() => setAttempt((value) => value + 1)}>
          {state.data && (
            <DisciplineForm
              key={id}
              discipline={state.data.discipline}
              onCancel={() => navigate("/portal/admin/discipline")}
              onSaved={(notice) =>
                navigate("/portal/admin/discipline", { state: { notice } })
              }
            />
          )}
        </State>
      ) : (
        <Empty
          title="Choose a discipline to edit"
          text="Open the discipline list and select Edit beside a record."
          action={
            <Link className="btn button" to="/portal/admin/discipline">
              View disciplines
            </Link>
          }
        />
      )}
    </>
  );
}
