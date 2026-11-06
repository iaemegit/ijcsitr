"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../../lib/navigation";
import adminApi from "../../../services/adminApi";
import State from "../../../components/State";
import EditorialBoardForm from "./EditorialBoardForm";
import type { BoardMember } from "./editorial-board-types";
export default function EditEditorialBoardPage() {
  const navigate = useNavigate(),
    [params] = useSearchParams(),
    id = params.get("id"),
    valid = /^[1-9]\d*$/.test(id || "") && Number(id) <= 2147483647;
  const [retry, setRetry] = useState(0),
    [state, setState] = useState<{
      loading: boolean;
      error?: string;
      member?: BoardMember;
    }>({ loading: true });
  useEffect(() => {
    if (!valid) return;
    const controller = new AbortController();
    setState({ loading: true });
    adminApi("/editorial-board/" + id, { signal: controller.signal })
      .then((data) => setState({ loading: false, member: data.member }))
      .catch((err) => {
        if (err.name !== "AbortError")
          setState({ loading: false, error: err.message });
      });
    return () => controller.abort();
  }, [id, valid, retry]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/editorial-board">
        Back to editorial board
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / EDITORIAL BOARD / EDIT</span>
          <h1>
            {valid
              ? "Edit editorial board member"
              : "Choose a board member to edit"}
          </h1>
        </div>
      </div>
      {valid && (
        <State {...state} retry={() => setRetry((v) => v + 1)}>
          {state.member && (
            <EditorialBoardForm
              key={state.member.member_id}
              member={state.member}
              onCancel={() => navigate("/portal/admin/editorial-board")}
              onSaved={(notice) =>
                navigate("/portal/admin/editorial-board", { state: { notice } })
              }
            />
          )}
        </State>
      )}
    </>
  );
}
