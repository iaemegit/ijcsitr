"use client";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "../../../lib/navigation";
import AuthorForm from "./AuthorForm";
export default function AddAuthorPage() {
  const navigate = useNavigate();
  return (
    <>
      <Link className="back-link" to="/portal/admin/author">
        <ArrowLeft size={15} /> Back to authors
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / AUTHOR / ADD</span>
          <h1>Add author</h1>
          <p>Add a researcher profile to the journal.</p>
        </div>
      </div>
      <AuthorForm
        onCancel={() => navigate("/portal/admin/author")}
        onSaved={(notice) =>
          navigate("/portal/admin/author", { state: { notice } })
        }
      />
    </>
  );
}
