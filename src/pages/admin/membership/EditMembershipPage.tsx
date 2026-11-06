"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../../lib/navigation";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
import MembershipForm from "./MembershipForm";
import type { MembershipMember } from "./membership-types";
export default function EditMembershipPage() {
  const navigate = useNavigate(),
    [params] = useSearchParams(),
    id = params.get("id"),
    valid = /^[1-9]\d*$/.test(id || "") && Number(id) <= 2147483647;
  const [retry, setRetry] = useState(0),
    [state, setState] = useState<{
      loading: boolean;
      error?: string;
      member?: MembershipMember;
    }>({ loading: true });
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/memberships/" + id, { signal: controller.signal })
      .then((data) => setState({ loading: false, member: data.member }))
      .catch((err) => {
        if (err.name !== "AbortError")
          setState({ loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [id, valid, retry]);
  return (
    <>
      <Link to="/portal/admin/membership" className="back-link">
        Back to memberships
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / MEMBERSHIP / EDIT</span>
          <h1>{valid ? "Edit membership" : "Choose a membership to edit"}</h1>
        </div>
      </div>
      {valid && (
        <State {...state} retry={() => setRetry((v) => v + 1)}>
          {state.member && (
            <MembershipForm
              key={state.member.membership_id}
              member={state.member}
              onCancel={() => navigate("/portal/admin/membership")}
              onSaved={(notice) =>
                navigate("/portal/admin/membership", { state: { notice } })
              }
            />
          )}
        </State>
      )}
    </>
  );
}
