"use client";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "../../../lib/navigation";
import AffiliationForm from "./AffiliationForm";
export default function AddAffiliationPage() {
  const navigate = useNavigate();
  return (
    <>
      <Link className="back-link" to="/portal/admin/affiliation">
        <ArrowLeft size={15} /> Back to affiliations
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / AFFILIATION / ADD</span>
          <h1>Add affiliation</h1>
          <p>
            Add an institution or organization to the journal’s affiliations.
          </p>
        </div>
      </div>
      <AffiliationForm
        onCancel={() => navigate("/portal/admin/affiliation")}
        onSaved={(notice) =>
          navigate("/portal/admin/affiliation", { state: { notice } })
        }
      />
    </>
  );
}
