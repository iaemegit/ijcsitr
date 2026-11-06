"use client";
import { Link, useNavigate } from "../../../lib/navigation";
import CallForPaperForm from "./CallForPaperForm";
export default function AddCallForPaperPage() {
  const navigate = useNavigate();
  return (
    <>
      <Link className="back-link" to="/portal/admin/call-for-paper">
        Back to calls for papers
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / CALL FOR PAPERS / ADD</span>
          <h1>Add New Call for Papers</h1>
          <p>Plan submissions and dispatch dates for an upcoming issue.</p>
        </div>
      </div>
      <CallForPaperForm
        onCancel={() => navigate("/portal/admin/call-for-paper")}
        onSaved={(notice) =>
          navigate("/portal/admin/call-for-paper", { state: { notice } })
        }
      />
    </>
  );
}
