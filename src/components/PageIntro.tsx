"use client";
import JournalBreadcrumb from "./JournalBreadcrumb";
function PageIntro({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="page-intro">
      <div className="container">
        <div className="intro-row">
          <div>
            <JournalBreadcrumb title={title} />
            <span className="eyebrow muted">{label}</span>
            <h1>
              {title}
              <span className="orange-dot">.</span>
            </h1>
            {description && <p>{description}</p>}
          </div>
          {children}
        </div>
      </div>
    </section>
  );
}
export default PageIntro;
