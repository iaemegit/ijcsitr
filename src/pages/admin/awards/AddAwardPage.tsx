"use client";
import { Link, useNavigate } from "../../../lib/navigation";
import AwardForm from "./AwardForm";
export default function AddAwardPage() {
  const navigate = useNavigate();
  return (
    <>
      <Link to="/portal/admin/awards" className="back-link">
        Back to awards
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / AWARDS / ADD</span>
          <h1>Add New Award</h1>
          <p>
            Recognize an achievement with recipient details, an award citation,
            and professional profiles.
          </p>
        </div>
      </div>
      <AwardForm
        onCancel={() => navigate("/portal/admin/awards")}
        onSaved={(notice) =>
          navigate("/portal/admin/awards", { state: { notice } })
        }
      />
    </>
  );
}
