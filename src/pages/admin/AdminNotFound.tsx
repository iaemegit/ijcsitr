"use client";
import { Link } from "../../lib/navigation";
import Empty from "../../components/Empty";
export default function AdminNotFound() {
  return (
    <Empty
      title="Admin page not found"
      text="Choose a form from the menu to continue."
      action={
        <Link to="/portal/admin/dashboard" className="btn button">
          Back to dashboard
        </Link>
      }
    />
  );
}
