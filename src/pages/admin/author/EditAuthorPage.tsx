"use client";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "../../../lib/navigation";
import { ArrowLeft } from "lucide-react";
import State from "../../../components/State";
import Empty from "../../../components/Empty";
import adminApi from "../../../services/adminApi";
import AuthorForm from "./AuthorForm";
export default function EditAuthorPage() {
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
    adminApi("/authors/" + id, { signal: controller.signal })
      .then((data) => setState({ data, loading: false }))
      .catch((error) => {
        if (error.name !== "AbortError")
          setState({ error: error.message, loading: false });
      });
    return () => controller.abort();
  }, [id, valid, retry]);
  return (
    <>
      <Link className="back-link" to="/portal/admin/author">
        <ArrowLeft size={15} /> Back to authors
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / AUTHOR / EDIT</span>
          <h1>Edit author</h1>
          <p>
            {valid
              ? `Update author #${id}.`
              : "Select an author from the list to edit."}
          </p>
        </div>
      </div>
      {valid ? (
        <State {...state} retry={() => setRetry((value) => value + 1)}>
          {state.data && (
            <AuthorForm
              key={id}
              author={state.data.author}
              onCancel={() => navigate("/portal/admin/author")}
              onSaved={(notice) =>
                navigate("/portal/admin/author", { state: { notice } })
              }
            />
          )}
        </State>
      ) : (
        <Empty
          title="Choose an author to edit"
          text="Select Edit beside a record in the author list."
          action={
            <Link className="btn button" to="/portal/admin/author">
              View authors
            </Link>
          }
        />
      )}
    </>
  );
}
