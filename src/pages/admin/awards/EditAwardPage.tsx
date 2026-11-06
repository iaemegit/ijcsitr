"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../../lib/navigation";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
import AwardForm from "./AwardForm";
import type { AwardRecord } from "./award-types";
export default function EditAwardPage() {
  const navigate = useNavigate(),
    [params] = useSearchParams(),
    id = params.get("id"),
    valid = /^[1-9]\d*$/.test(id || "") && Number(id) <= 2147483647;
  const [retry, setRetry] = useState(0),
    [state, setState] = useState<{
      loading: boolean;
      error?: string;
      member?: AwardRecord;
    }>({ loading: true });
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/awards/" + id, { signal: controller.signal })
      .then((data) => setState({ loading: false, member: data.member }))
      .catch((err) => {
        if (err.name !== "AbortError")
          setState({ loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [id, valid, retry]);
  return (
    <>
      <Link to="/portal/admin/awards" className="back-link">
        Back to awards
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / AWARDS / EDIT</span>
          <h1>{valid ? "Edit award" : "Choose an award to edit"}</h1>
        </div>
      </div>
      {valid && (
        <State {...state} retry={() => setRetry((v) => v + 1)}>
          {state.member && (
            <AwardForm
              key={state.member.id}
              member={state.member}
              onCancel={() => navigate("/portal/admin/awards")}
              onSaved={(notice) =>
                navigate("/portal/admin/awards", { state: { notice } })
              }
            />
          )}
        </State>
      )}
    </>
  );
}
