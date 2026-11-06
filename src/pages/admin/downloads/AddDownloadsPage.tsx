"use client";
import { Link, useNavigate } from "../../../lib/navigation";
import ContentForm from "../../../components/admin/ContentForm";
import { downloadsConfig } from "./downloads-config";
export default function AddDownloadsPage() {
  const navigate = useNavigate(),
    base = "/portal/admin/downloads";
  return (
    <>
      <Link className="back-link" to={base}>
        Back to Downloads
      </Link>
      <div className="admin-page-heading">
        <div>
          <h1>Add Download</h1>
          <p>{downloadsConfig.description}</p>
        </div>
      </div>
      <ContentForm
        config={downloadsConfig}
        onCancel={() => navigate(base)}
        onSaved={(notice) => navigate(base, { state: { notice } })}
      />
    </>
  );
}
