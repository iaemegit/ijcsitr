"use client";
import { Link, useNavigate } from "../../../lib/navigation";
import ContentForm from "../../../components/admin/ContentForm";
import { testimonialConfig } from "./testimonial-config";
export default function AddTestimonialPage() {
  const navigate = useNavigate(),
    base = "/portal/admin/testimonial";
  return (
    <>
      <Link className="back-link" to={base}>
        Back to Testimonial
      </Link>
      <div className="admin-page-heading">
        <div>
          <h1>Add Testimonial</h1>
          <p>{testimonialConfig.description}</p>
        </div>
      </div>
      <ContentForm
        config={testimonialConfig}
        onCancel={() => navigate(base)}
        onSaved={(notice) => navigate(base, { state: { notice } })}
      />
    </>
  );
}
