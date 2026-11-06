"use client";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "../../../lib/navigation";
import DisciplineForm from "./DisciplineForm";
import "./discipline.css";
export default function AddDisciplinePage() {
  const navigate = useNavigate();
  return (
    <>
      <Link className="back-link" to="/portal/admin/discipline">
        <ArrowLeft size={15} /> Back to disciplines
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / DISCIPLINE / ADD</span>
          <h1>Add discipline</h1>
          <p>Add a research discipline to your journal.</p>
        </div>
      </div>
      <DisciplineForm
        onCancel={() => navigate("/portal/admin/discipline")}
        onSaved={(notice) =>
          navigate("/portal/admin/discipline", { state: { notice } })
        }
      />
    </>
  );
}
