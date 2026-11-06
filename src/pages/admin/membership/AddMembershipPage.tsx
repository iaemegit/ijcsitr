"use client";
import { Link, useNavigate } from "../../../lib/navigation";
import MembershipForm from "./MembershipForm";
export default function AddMembershipPage() {
  const navigate = useNavigate();
  return (
    <>
      <Link to="/portal/admin/membership" className="back-link">
        Back to memberships
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / MEMBERSHIP / ADD</span>
          <h1>Add membership</h1>
          <p>Enter membership details and academic profiles.</p>
        </div>
      </div>
      <MembershipForm
        onCancel={() => navigate("/portal/admin/membership")}
        onSaved={(notice) =>
          navigate("/portal/admin/membership", { state: { notice } })
        }
      />
    </>
  );
}
