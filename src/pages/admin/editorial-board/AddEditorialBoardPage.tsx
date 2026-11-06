"use client";
import { Link, useNavigate } from "../../../lib/navigation";
import EditorialBoardForm from "./EditorialBoardForm";
export default function AddEditorialBoardPage() {
  const navigate = useNavigate();
  return (
    <>
      <Link to="/portal/admin/editorial-board" className="back-link">
        Back to editorial board
      </Link>
      <div className="admin-page-heading">
        <div>
          <span className="eyebrow muted">FORMS / EDITORIAL BOARD / ADD</span>
          <h1>Add editorial board member</h1>
          <p>
            Enter the member’s name, role, affiliation and academic profiles.
          </p>
        </div>
      </div>
      <EditorialBoardForm
        onCancel={() => navigate("/portal/admin/editorial-board")}
        onSaved={(notice) =>
          navigate("/portal/admin/editorial-board", { state: { notice } })
        }
      />
    </>
  );
}
